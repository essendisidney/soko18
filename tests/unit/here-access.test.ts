import { describe, expect, it } from "vitest";
import { hasSettledAccess, pendingAccess, settleAccess, spendAccess, startAccess } from "@/lib/payments/access";
import { ACCESS_CATALOG, LOCAL_ACCESS } from "@/lib/payments/catalog";
import { ACTIVE_MS, RECENT_MS, hereLine, presenceFrom } from "@/lib/presence/here";

const now = Date.parse("2026-09-01T18:00:00.000Z");

describe("area presence", () => {
  it("decays active to recent to offline and never invents a pin", () => {
    expect(presenceFrom(now, now)).toBe("active");
    expect(presenceFrom(now - ACTIVE_MS + 1, now)).toBe("active");
    expect(presenceFrom(now - ACTIVE_MS, now)).toBe("recent");
    expect(presenceFrom(now - RECENT_MS + 1, now)).toBe("recent");
    expect(presenceFrom(now - RECENT_MS, now)).toBe("offline");
    expect(hereLine(null, now)).toBe("Area-level only. Never a live pin.");
    expect(hereLine({ areaSlug: "kilimani", citySlug: "nairobi", at: now }, now)).toBe("Kilimani · here now");
    expect(hereLine({ areaSlug: "milimani", citySlug: "kisumu", at: now - ACTIVE_MS }, now)).toBe(
      "Milimani · recently here",
    );
    expect(hereLine({ areaSlug: "westlands", citySlug: "nairobi", at: now - RECENT_MS }, now)).toBe(
      "Westlands · last here",
    );
  });
});

describe("skip access ledger", () => {
  it("does not grant skip until the sandbox row settles", () => {
    const started = startAccess([], "skip", "2026-09-01T18:00:00.000Z", "skip-1");
    expect(started.row.amountKes).toBe(ACCESS_CATALOG.skip.amountKes);
    expect(started.row.status).toBe("pending");
    expect(hasSettledAccess(started.ledger, "skip")).toBe(false);
    expect(pendingAccess(started.ledger, "skip")?.id).toBe("skip-1");
    expect(startAccess(started.ledger, "skip", "2026-09-01T18:01:00.000Z", "skip-2").row.id).toBe("skip-1");

    const settled = settleAccess(started.ledger, "skip-1");
    expect(settled.ok).toBe(true);
    if (!settled.ok) return;
    expect(hasSettledAccess(settled.ledger, "skip")).toBe(true);
    expect(pendingAccess(settled.ledger, "skip")).toBeNull();
    expect(settleAccess(settled.ledger, "skip-1")).toEqual({ ok: false, reason: "settled" });
    expect(settleAccess([], "missing")).toEqual({ ok: false, reason: "missing" });
  });

  it("spends mystery after one card and never grants incognito without settle", () => {
    expect(LOCAL_ACCESS.mystery.amountKes).toBe(ACCESS_CATALOG.mystery.amountKes);
    const started = startAccess([], "mystery", "2026-09-01T18:00:00.000Z", "m1");
    expect(spendAccess(started.ledger, "m1")).toEqual({ ok: false, reason: "pending" });
    const settled = settleAccess(started.ledger, "m1");
    expect(settled.ok).toBe(true);
    if (!settled.ok) return;
    const spent = spendAccess(settled.ledger, "m1");
    expect(spent.ok).toBe(true);
    if (!spent.ok) return;
    expect(hasSettledAccess(spent.ledger, "mystery")).toBe(false);
    expect(startAccess(spent.ledger, "mystery", "2026-09-01T18:02:00.000Z", "m2").row.id).toBe("m2");
    expect(hasSettledAccess([], "incognito")).toBe(false);
  });
});
