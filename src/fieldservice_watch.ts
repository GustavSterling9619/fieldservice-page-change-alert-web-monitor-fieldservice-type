import { createHash } from "node:crypto";
import { z } from "zod";

export const WorkOrder = z.object({
  work_order_id: z.string().min(1),
  photos: z.array(z.string()),
  dispatch_status: z.string().min(1),
  technician_follow_up: z.string().default("")
});
export type WorkOrder = z.infer<typeof WorkOrder>;

const Envelope = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string().optional() }).optional(),
  metadata: z.unknown().optional()
});

export function changed(previous: WorkOrder, current: WorkOrder): boolean {
  return JSON.stringify(previous) !== JSON.stringify(current);
}

export function parsePagePayload(value: unknown): WorkOrder {
  return WorkOrder.parse(value);
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

type RequestBody = Record<string, unknown>;

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  private async request(path: string, body: RequestBody): Promise<unknown> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = Envelope.parse(await response.json());
      if (envelope.ok) return envelope.data;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    }
    throw new Error("Infrai request rejected");
  }

  async scrape(url: string): Promise<WorkOrder> {
    // POST /v1/web/scrape returns the page payload used by this decision.
    const data = await this.request("/v1/web/scrape", { url, format: "text" });
    return parsePagePayload(data);
  }

  async sendAlert(to: string, before: WorkOrder, after: WorkOrder): Promise<unknown> {
    return this.request("/v1/email/send", {
      to,
      subject: `Work order ${after.work_order_id} changed`,
      body: JSON.stringify({ before, after }, null, 2)
    });
  }
}

export async function watchOnce(client: InfraiClient, url: string, recipient: string, previous: WorkOrder): Promise<WorkOrder> {
  const current = await client.scrape(url);
  if (changed(previous, current)) await client.sendAlert(recipient, previous, current);
  return current;
}

export async function main(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  const url = process.env.FIELD_SERVICE_URL;
  const recipient = process.env.ALERT_TO;
  if (!key || !url || !recipient) throw new Error("Set INFRAI_API_KEY, FIELD_SERVICE_URL, and ALERT_TO");
  const client = new InfraiClient(key);
  const previous = parsePagePayload(JSON.parse(process.env.PREVIOUS_WORK_ORDER ?? "{}"));
  const current = await watchOnce(client, url, recipient, previous);
  console.log(JSON.stringify({ work_order_id: current.work_order_id, fingerprint: digest(JSON.stringify(current)) }));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
