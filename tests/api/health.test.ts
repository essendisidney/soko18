import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { siteUrl } from "@/lib/site";

describe("production rails", () => {
  it("reports health without leaking secrets", async () => {
    const res = await GET();
    const body = (await res.json()) as { ok: boolean; city: string; supabase: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.city).toBe("nairobi");
    expect(typeof body.supabase).toBe("boolean");
    expect(JSON.stringify(body)).not.toMatch(/service_role|SUPABASE_SERVICE/i);
  });

  it("uses an explicit app URL when set", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://soko18.vercel.app/";
    try {
      expect(siteUrl()).toBe("https://soko18.vercel.app");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});
