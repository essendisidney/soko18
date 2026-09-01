import { describe, expect, it } from "vitest";
import { POST as postFavorite } from "@/app/api/favorites/route";
import { POST as postBlock } from "@/app/api/blocks/route";
import { POST as postReport } from "@/app/api/reports/route";
import { POST as postPanic } from "@/app/api/safety/panic/route";
import { POST as postShare } from "@/app/api/safety/share/route";
import { POST as postRating } from "@/app/api/ratings/route";
import { POST as postIdentity } from "@/app/api/verify/identity/route";

describe("profile safety APIs", () => {
  it("favorite requires a session to persist", async () => {
    const res = await postFavorite(
      new Request("http://soko18.test/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "p1", saved: true }),
      }),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("block requires a session to persist", async () => {
    const res = await postBlock(
      new Request("http://soko18.test/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "p1", blocked: true }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("profile report requires a session", async () => {
    const res = await postReport(
      new Request("http://soko18.test/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "p1", reason: "spam" }),
      }),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });
});

describe("paid safety APIs", () => {
  it("panic, share, rate, and identity require a session", async () => {
    const panic = await postPanic(
      new Request("http://soko18.test/api/safety/panic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat: -1.29, lng: 36.82, name: "Pat", phone: "0712345678" }),
      }),
    );
    const share = await postShare(
      new Request("http://soko18.test/api/safety/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat: -1.29, lng: 36.82, name: "Pat", phone: "0712345678" }),
      }),
    );
    const rating = await postRating(
      new Request("http://soko18.test/api/ratings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: "p1", score: 5 }),
      }),
    );
    const identity = await postIdentity(
      new Request("http://soko18.test/api/verify/identity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "identity" }),
      }),
    );
    expect(panic.status).toBe(401);
    expect(share.status).toBe(401);
    expect(rating.status).toBe(401);
    expect(identity.status).toBe(401);
  });
});
