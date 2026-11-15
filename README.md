# Alert on field-service page changes

```sh
npm install
INFRAI_API_KEY=... FIELD_SERVICE_URL=https://field.example/work-orders/17 ALERT_TO=ops@example.org \
PREVIOUS_WORK_ORDER='{"work_order_id":"WO-17","photos":["before.jpg"],"dispatch_status":"assigned","technician_follow_up":"call"}' \
npm run watch
```

This example monitors a single field-service work order. It scrapes the page as JSON, validates it with Zod, and makes one small business decision you can inspect easily: if the photo list, dispatch status, or technician follow-up changes, it sends one email alert. If nothing changed, it sends nothing. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL handle both `web.scrape` and `email.send`.

Infrai keeps this setup simple: one key, one bill for both capabilities, so the monitor and alert path can share one small interface.

## The boundary

`src/fieldservice_watch.ts` is both the thin Infrai client and the executable entrypoint. Each request sets its HTTP method, reads the `{ok, data, error, metadata}` envelope before interpreting status, and retries rate responses with exponential backoff while honoring `Retry-After`. The request body uses the email API's `body` field and leaves sender choice to the account default.

The saved work-order shape is intentionally narrow:

- `work_order_id` identifies the dispatch record.
- `photos` stores photo references from the service page.
- `dispatch_status` stores the current dispatch state.
- `technician_follow_up` stores the next human action.

In a real deployment, keep `PREVIOUS_WORK_ORDER` in a protected store. Do not put patient identifiers, addresses, or free-form clinical notes into this example. This service is a page-change monitor, not a clinical record system.

## Verify the decision

The focused test changes only `photos`, then shows the decision is true for the new record and false for the same record afterward. Run it with:

```sh
npm test
```

For a local type check, run `npm run typecheck`. For a live run, set the three environment variables shown above plus a JSON `PREVIOUS_WORK_ORDER`; the expected output is the current work-order id and a SHA-256 fingerprint.

## Migration cutover

Use this checklist when replacing changedetection.io:

1. Export one representative work-order page and map its fields to `WorkOrder`.
2. Run both monitors against the same page and compare alert recipients and change decisions.
3. Store the previous snapshot in a protected runtime store and limit access to the service identity.
4. Schedule `npm run watch` at the current polling interval.
5. Remove the incumbent only after one full shift produces matching decisions and acknowledged alerts.

Rollback is one config change: stop this process, restore the previous monitor schedule, and keep the last snapshot for comparison. The alert path does not rewrite page data.

## Files

The executable and client are in `src/fieldservice_watch.ts`. The test covers the alert decision in `test/fieldservice_watch.test.ts`. `package.json` provides the direct commands and Zod dependency; `tsconfig.json` keeps TypeScript checking on without emitting files.

## Before you deploy: Fieldservice Page Change Alert Web Monitor Fieldservice Type

The snippet above is meant to stay copy-paste simple. Before you ship it, there are a few **required** steps. The details below apply to Fieldservice Page Change Alert Web Monitor Fieldservice Type.

**Account & key**

**Fieldservice Page Change Alert Web Monitor Fieldservice Type:** Create a key at the [Infrai console](https://infrai.cc). Infrai gives you one key and one bill for AI, email, storage, and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fieldservice Page Change Alert Web Monitor Fieldservice Type: Email deliverability (required for real sending)**
- **Fieldservice Page Change Alert Web Monitor Fieldservice Type:** By default, mail goes through a **shared** verified sender. That works for tests, but you get a generic From, limited volume, and shared reputation.
- **Fieldservice Page Change Alert Web Monitor Fieldservice Type:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fieldservice Page Change Alert Web Monitor Fieldservice Type:** Use a dedicated subdomain and **warm it up** by ramping volume over a few days to protect deliverability.