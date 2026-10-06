import { describe, expect, it } from "vitest";
import { GET as campusGet } from "@/app/api/campus/route";
import { POST as codePost } from "@/app/api/campus/code/route";
import { POST as confirmPost } from "@/app/api/campus/confirm/route";
import { POST as loginPost } from "@/app/api/campus/login/route";
import { GET as discoverGet } from "@/app/api/discover/route";

function json(body: unknown) {
  return new Request("http://soko18.test/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("campus API without a signed-in member", () => {
  it("shows an empty board and no campus, never invented counts", async () => {
    const res = await campusGet();
    const body = (await res.json()) as { data: { mine: unknown; board: unknown[] } };
    expect(res.status).toBe(200);
    expect(body.data.mine).toBeNull();
    expect(body.data.board).toEqual([]);
  });

  it("needs sign-in to verify", async () => {
    expect((await loginPost()).status).toBe(401);
    expect((await codePost(json({ email: "amina@students.uonbi.ac.ke" }))).status).toBe(401);
    expect((await confirmPost(json({ code: "123456" }))).status).toBe(401);
  });

  it("rejects malformed input before anything else", async () => {
    const bad = await codePost(json({ email: "not-an-email" }));
    expect(bad.status).toBe(400);
    const code = await confirmPost(json({ code: "12ab" }));
    expect(code.status).toBe(400);
  });

  it("never falls back to the city deck when the campus deck is not allowed", async () => {
    const res = await discoverGet(new Request("http://soko18.test/api/discover?campus=uon"));
    const body = (await res.json()) as { data: { items: unknown[]; nextCursor: null; campusLocked: boolean } };
    expect(body.data.items).toEqual([]);
    expect(body.data.nextCursor).toBeNull();
    expect(body.data.campusLocked).toBe(true);
  });

  it("ignores junk campus slugs", async () => {
    const res = await discoverGet(new Request("http://soko18.test/api/discover?campus=..%2Fadmin"));
    const body = (await res.json()) as { data: { items: unknown[]; campusLocked: boolean } };
    expect(body.data.items).toEqual([]);
    expect(body.data.campusLocked).toBe(true);
  });
});
