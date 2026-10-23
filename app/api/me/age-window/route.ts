import { NextResponse } from "next/server";
import { z } from "zod";
import { myAgeWindow } from "@/lib/discovery/age-window";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json({ data: await myAgeWindow() });
}

const body = z.object({ min: z.number().int().min(18).max(99), max: z.number().int().min(18).max(99) }).refine((v) => v.min <= v.max);

export async function PUT(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid", message: "Pick an age range between 18 and 99." } }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in first." } }, { status: 401 });
  const { data, error } = await supabase.rpc("set_age_window", { p_min: parsed.data.min, p_max: parsed.data.max });
  if (error) return NextResponse.json({ error: { code: "invalid", message: "Could not save your age range." } }, { status: 400 });
  return NextResponse.json({ data });
}
