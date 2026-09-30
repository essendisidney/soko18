import { describe, expect, it } from "vitest";
import { hasSettledAccess, pendingAccess, settleAccess, spendAccess, startAccess } from "@/lib/payments/access";
import { LOCAL_ACCESS } from "@/lib/payments/catalog";
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
    expect(hereLine({ areaSlug: "kilimani", citySlug: "kisumu", at: now }, now)).toBe("Around you · here now");
  });
});

describe("local sandbox access ledger", () => {
  it("does not grant Gold until the sandbox row settles", () => {
    const started = startAccess([], "gold", "2026-09-01T18:00:00.000Z", "g-1");
    expect(started.row.amountKes).toBe(LOCAL_ACCESS.gold.amountKes);
    expect(started.row.status).toBe("pending");
    expect(hasSettledAccess(started.ledger, "gold")).toBe(false);
    expect(pendingAccess(started.ledger, "gold")?.id).toBe("g-1");
    expect(startAccess(started.ledger, "gold", "2026-09-01T18:01:00.000Z", "g-2").row.id).toBe("g-1");

    const settled = settleAccess(started.ledger, "g-1");
    expect(settled.ok).toBe(true);
    if (!settled.ok) return;
    expect(hasSettledAccess(settled.ledger, "gold")).toBe(true);
    expect(pendingAccess(settled.ledger, "gold")).toBeNull();
    expect(settleAccess(settled.ledger, "g-1")).toEqual({ ok: false, reason: "settled" });
    expect(settleAccess([], "missing")).toEqual({ ok: false, reason: "missing" });
  });

  it("cannot spend a pending row and never grants incognito without settle", () => {
    const started = startAccess([], "incognito", "2026-09-01T18:00:00.000Z", "i1");
    expect(spendAccess(started.ledger, "i1")).toEqual({ ok: false, reason: "pending" });
    expect(hasSettledAccess([], "incognito")).toBe(false);
  });
});
