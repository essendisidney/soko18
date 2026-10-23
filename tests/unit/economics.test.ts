import { describe, expect, it } from "vitest";
import { breakEven, monthParam } from "@/lib/admin/economics";

describe("owner economics", () => {
  it("shows nothing until there is real data", () => {
    const empty = breakEven({ costsKes: 0, netKes: 0, payingMembersKes: 0, payingMembers: 0, activeMembers: 0 });
    expect(empty).toEqual({ arppu: null, payingShare: null, payersNeeded: null, membersNeeded: null, covered: null });
    expect(breakEven({ costsKes: 50_000, netKes: 0, payingMembersKes: 0, payingMembers: 0, activeMembers: 40 }).payersNeeded).toBeNull();
  });

  it("works out break-even from net ARPPU and the paying share", () => {
    // 100 paying members, KES 20,000 net → ARPPU 200. Costs 50,000 → 250 payers. 10% pay → 2,500 members.
    const be = breakEven({ costsKes: 50_000, netKes: 20_000, payingMembersKes: 100, payingMembers: 100, activeMembers: 1_000 });
    expect(be.arppu).toBe(200);
    expect(be.payingShare).toBe(0.1);
    expect(be.payersNeeded).toBe(250);
    expect(be.membersNeeded).toBe(2_500);
    expect(be.covered).toBe(false);
  });

  it("reads a month from the URL safely", () => {
    expect(monthParam("2026-10")).toBe("2026-10-01");
    expect(monthParam("2026-13")).toBeNull();
    expect(monthParam("x; drop")).toBeNull();
    expect(monthParam(undefined)).toBeNull();
  });
});
