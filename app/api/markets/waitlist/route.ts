import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const schema = z.object({ country: z.string().regex(/^[A-Z]{2}$/), email: z.string().email().max(200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid", message: "Enter a valid email." } }, { status: 400 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ data: { joined: false } });
  const supabase = await createClient();
  const { error } = await supabase
    .from("market_waitlist")
    .insert({ country_code: parsed.data.country, email: parsed.data.email.toLowerCase() });
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: { code: "invalid", message: "Could not join." } }, { status: 400 });
  }
  return NextResponse.json({ data: { joined: true } });
}
