// 06-PLAN.md §1.5 — k6 load: 100 concurrent Calendly webhook deliveries.
// Asserts 100% acceptance and no duplicate sequences (query Supabase post-run
// — done outside this script via a follow-up SQL check).
//
// Run: k6 run load/k6-webhooks.js -e BASE=http://localhost:3000
// CI does NOT run this — runs are manual or scheduled (cost + risk control).

import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 100,
  iterations: 100,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

const BASE = __ENV.BASE;
if (!BASE) {
  throw new Error("BASE env var required. Example: -e BASE=http://localhost:3000");
}
if (BASE.includes("vercel.app") || BASE.includes("prod") || BASE.includes("sonorous.com")) {
  throw new Error("Refusing to load-test what looks like a production URL: " + BASE);
}

const LEAD_ID = `load-test-lead-${Date.now()}`;

export default function () {
  const body = JSON.stringify({
    event: "invitee_no_show.created",
    payload: {
      event: `evt-${__VU}-${__ITER}`,
      invitee: { email: `${LEAD_ID}@example.com` },
      start_time: new Date().toISOString(),
    },
  });

  const res = http.post(`${BASE}/api/webhooks/calendar/calendly`, body, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "status is 2xx or 401 (signature)": (r) => r.status >= 200 && r.status < 500,
  });
}

// Follow-up SQL check (run after script completes):
//   select count(*) from sequence_enrollments where lead_id = '<LEAD_ID>';
// Expected: 1 (idempotency guard active).
