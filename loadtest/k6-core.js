// Load test for the launch checklist: Discover, likes and messages at 1,000 concurrent members.
// Run ONLY against the paid Supabase project and a preview deployment, never the free project:
//
//   k6 run -e BASE_URL=https://<preview>.vercel.app -e TOKENS_FILE=./tokens.json loadtest/k6-core.js
//
// tokens.json is a list of { "cookie": "<session cookie>", "profileId": "<a live test profile>",
// "conversation": "<a match slug>" } for test accounts (is_test = true), so no real member is touched.
import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const tokens = new SharedArray("tokens", () => JSON.parse(open(__ENV.TOKENS_FILE || "./tokens.json")));
const BASE = __ENV.BASE_URL;

export const options = {
  scenarios: {
    members: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 250 },
        { duration: "3m", target: 1000 },
        { duration: "5m", target: 1000 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{name:discover}": ["p(95)<800"],
    "http_req_duration{name:like}": ["p(95)<500"],
    "http_req_duration{name:message}": ["p(95)<500"],
  },
};

export default function () {
  const t = tokens[__VU % tokens.length];
  const headers = { Cookie: t.cookie, "Content-Type": "application/json" };
  const deck = http.get(`${BASE}/api/discover?city=nairobi`, { headers, tags: { name: "discover" } });
  check(deck, { "discover 200": (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);
  const like = http.post(`${BASE}/api/likes`, JSON.stringify({ profileId: t.profileId, kind: "pass" }), { headers, tags: { name: "like" } });
  check(like, { "like ok": (r) => r.status === 200 || r.status === 429 });
  sleep(1 + Math.random() * 2);
  if (t.conversation) {
    const msg = http.get(`${BASE}/api/conversations/${t.conversation}/messages`, { headers, tags: { name: "message" } });
    check(msg, { "messages ok": (r) => r.status === 200 || r.status === 404 });
  }
  sleep(2 + Math.random() * 3);
}
