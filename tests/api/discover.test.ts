import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/discover/route";

describe("GET /api/discover", () => {
  it("excludes passed or liked ids from the ranked deck", async () => {
    const open = await GET(new Request("http://soko18.test/api/discover"));
    const openBody = (await open.json()) as { data: { items: { id: string }[] } };
    const first = openBody.data.items[0]?.id;
    expect(first).toBeTruthy();

    const excluded = await GET(new Request(`http://soko18.test/api/discover?exclude=${first}`));
    const body = (await excluded.json()) as { data: { items: { id: string }[] } };

    expect(body.data.items.some((item) => item.id === first)).toBe(false);
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  it("returns an empty deck outside Nairobi", async () => {
    const res = await GET(new Request("http://soko18.test/api/discover?city=kisumu"));
    const body = (await res.json()) as { data: { items: unknown[]; nextCursor: null } };
    expect(body.data.items).toEqual([]);
    expect(body.data.nextCursor).toBeNull();
  });
});
