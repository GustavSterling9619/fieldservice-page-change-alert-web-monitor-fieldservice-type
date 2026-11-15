import test from "node:test";
import assert from "node:assert/strict";
import { changed, parsePagePayload } from "../src/fieldservice_watch.ts";

test("alerts only when a work-order field changes", () => {
  const before = parsePagePayload({ work_order_id: "WO-17", photos: ["before.jpg"], dispatch_status: "assigned", technician_follow_up: "call" });
  const after = parsePagePayload({ work_order_id: "WO-17", photos: ["after.jpg"], dispatch_status: "assigned", technician_follow_up: "call" });
  assert.equal(changed(before, after), true);
  assert.equal(changed(before, before), false);
});
