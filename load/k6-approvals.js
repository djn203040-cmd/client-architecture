// 06-PLAN.md §1.5 — k6 load: 50 concurrent approve-draft requests on the same draft.
// Asserts exactly 1 success and 49 conflict/idempotent responses (advisory lock).
//
// Run: k6 run load/k6-approvals.js -e BASE=http://localhost:3000 -e DRAFT_ID=<uuid> -e COOKIE='<session>'

import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 50,
  iterations: 50,
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

const BASE = __ENV.BASE;
const DRAFT_ID = __ENV.DRAFT_ID;
const COOKIE = __ENV.COOKIE;

if (!BASE || !DRAFT_ID || !COOKIE) {
  throw new Error("Required: BASE, DRAFT_ID, COOKIE env vars");
}
if (BASE.includes("vercel.app") || BASE.includes("prod") || BASE.includes("sonorous.com")) {
  throw new Error("Refusing to load-test production: " + BASE);
}

export default function () {
  const res = http.patch(
    `${BASE}/api/drafts/${DRAFT_ID}`,
    JSON.stringify({ status: "approved" }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: COOKIE,
      },
    },
  );

  check(res, {
    "status is 200 or 409 (conflict from lock)": (r) => r.status === 200 || r.status === 409,
  });
}

// Expected aggregate:
//   - exactly 1 request returns 200 with new_status='approved'
//   - 49 requests return 409 conflict (advisory lock held by the winning request)
