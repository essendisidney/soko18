import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceClient: vi.fn() }));

import { superLikesFirst } from "@/lib/discovery/live";
import type { SeedProfile } from "@/lib/types";

const p = (id: string) => ({ id }) as SeedProfile;

describe("superLikesFirst", () => {
  it("puts people who Super Liked you first and marks them", () => {
    const out = superLikesFirst([p("a"), p("b"), p("c")], new Set(["c"]));
    expect(out.map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(out[0].superLikedYou).toBe(true);
    expect(out[1].superLikedYou).toBeUndefined();
  });
  it("never adds someone you can't already see", () => {
    expect(superLikesFirst([p("a")], new Set(["z"])).map((x) => x.id)).toEqual(["a"]);
  });
});
