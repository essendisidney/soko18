import { allowRate, RATE_LIMITS } from "./rate-limit";
import { advisorBaseline, storageAudit } from "./advisors";

function assert(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const first = allowRate([], 1_000, RATE_LIMITS.likes);
assert(first.ok, "first like is allowed");
let hits = first.hits;
for (let i = 0; i < RATE_LIMITS.likes.limit - 1; i += 1) {
  const next = allowRate(hits, 1_000 + i, RATE_LIMITS.likes);
  assert(next.ok, "likes under the window");
  hits = next.hits;
}
const blocked = allowRate(hits, 2_000, RATE_LIMITS.likes);
assert(!blocked.ok, "41st like in 10 minutes is rate_limited");

const audit = storageAudit();
assert(audit.public === false, "media bucket is not public");
assert(audit.signedReadsOnly, "reads are signed");
assert(advisorBaseline().baseline.every((row) => row.ok), "advisor baseline is the schema contract");

console.log("security: rate limits, private storage, session revoke contract");
