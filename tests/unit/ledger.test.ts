import { describe, expect, it } from "vitest";
import {
  appendLedger,
  canSetPaidUntil,
  featuredAllowed,
  PROMOTION_CATALOG,
  promotionUntil,
} from "@/lib/payments/ledger";
import { BUNDLE_CATALOG, COIN_PACK, COIN_PRICE, PRIVACY_CATALOG, ACCESS_CATALOG, SUBSCRIPTION_CATALOG } from "@/lib/payments/catalog";

const now = "2026-08-24T12:00:00.000Z";
const until = promotionUntil("featured", now);
const accountId = "acct-1";
const profileId = "prof-1";

describe("ledger append", () => {
  it("prices membership, boosts, and the tonight bundle", () => {
    expect(PROMOTION_CATALOG.boost.amountKes).toBe(500);
    expect(PROMOTION_CATALOG.spotlight.amountKes).toBe(1200);
    expect(PROMOTION_CATALOG.featured.amountKes).toBe(3500);
    expect(SUBSCRIPTION_CATALOG.basic.amountKes).toBe(5000);
    expect(SUBSCRIPTION_CATALOG.premium.amountKes).toBe(10000);
    expect(BUNDLE_CATALOG["spotlight-boost"].amountKes).toBe(1500);
    expect(PRIVACY_CATALOG.incognito.amountKes).toBe(1500);
    expect(PRIVACY_CATALOG.safety.amountKes).toBe(1000);
    expect(ACCESS_CATALOG.skip.amountKes).toBe(5000);
    expect(ACCESS_CATALOG.mystery.amountKes).toBe(200);
    expect(ACCESS_CATALOG.golden.amountKes).toBe(500);
    expect(COIN_PACK.kes).toBe(1000);
    expect(COIN_PRICE.boost).toBe(50);
  });

  it("does not allow featured without a covering ledger row", () => {
    expect(featuredAllowed({ featuredUntil: until, profileId, accountId, ledger: [], now })).toBe(false);
  });

  it("allows featured only after appendLedger for that account and profile", () => {
    const ledger = appendLedger([], {
      id: "l1",
      accountId,
      transactionId: "t1",
      type: "featured",
      amountKes: 3500,
      direction: "credit",
      profileId,
    });
    expect(featuredAllowed({ featuredUntil: until, profileId, accountId, ledger, now })).toBe(true);
  });

  it("rejects another account's ledger and accepts an admin adjustment", () => {
    expect(
      canSetPaidUntil({
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
    ).toBe(false);

    expect(
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
    ).toBe(true);
  });
});
