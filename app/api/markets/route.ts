import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { COUNTRY_COOKIE } from "@/lib/markets/constants";
import { resolveCountry } from "@/lib/markets/server";

export async function GET() {
  const country = await resolveCountry();
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: { country, markets: [{ country_code: "KE", name: "Kenya", status: "live" }] } });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("markets")
    .select("country_code, name, status, currency")
    .order("launch_order");
  return NextResponse.json({ data: { country, markets: data ?? [] } });
}

const schema = z.object({ country: z.string().regex(/^[A-Z]{2}$/) });

export async function PATCH(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid", message: "Pick a country." } }, { status: 400 });
  const store = await cookies();
  store.set(COUNTRY_COOKIE, parsed.data.country, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const user = await currentUser();
  if (user && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_my_country", { p_country: parsed.data.country });
    if (error) return NextResponse.json({ error: { code: "invalid", message: "Unknown country." } }, { status: 400 });
  }
  return NextResponse.json({ data: { country: parsed.data.country } });
}
