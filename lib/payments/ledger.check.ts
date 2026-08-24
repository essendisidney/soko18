import {
  appendLedger,
  canSetPaidUntil,
  featuredAllowed,
  PROMOTION_CATALOG,
  promotionUntil,
} from "./ledger";

function assert(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const now = "2026-08-24T12:00:00.000Z";
const until = promotionUntil("featured", now);
const accountId = "acct-1";
const profileId = "prof-1";

assert(PROMOTION_CATALOG.boost.amountKes === 500, "boost price");
assert(PROMOTION_CATALOG.spotlight.amountKes === 1200, "spotlight price");
assert(PROMOTION_CATALOG.featured.amountKes === 3500, "featured price");

assert(
  !featuredAllowed({ featuredUntil: until, profileId, accountId, ledger: [], now }),
  "featured without ledger must fail",
);

assert(
  !canSetPaidUntil({
    until,
    kind: "featured",
    profileId,
    accountId,
    ledger: [
      {
        id: "l0",
        accountId: "other",
        transactionId: "t0",
        type: "featured",
        amountKes: 3500,
        direction: "credit",
        profileId,
      },
    ],
    now,
  }),
  "another account's ledger cannot cover featured",
);

const ledger = appendLedger([], {
  id: "l1",
  accountId,
  transactionId: "t1",
  type: "featured",
  amountKes: 3500,
  direction: "credit",
  profileId,
});

assert(featuredAllowed({ featuredUntil: until, profileId, accountId, ledger, now }), "featured with ledger");
assert(featuredAllowed({ featuredUntil: null, profileId, accountId, ledger: [], now }), "clearing featured is allowed");
assert(
  canSetPaidUntil({
    until,
    kind: "boost",
    profileId,
    accountId,
    ledger: appendLedger([], {
      id: "l2",
      accountId,
      transactionId: "t2",
      type: "adjustment",
      amountKes: 1,
      direction: "credit",
      profileId,
    }),
    now,
  }),
  "admin adjustment covers a paid flag",
);

console.log("ledger: featured cannot exist without ledger");
