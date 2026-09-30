import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const schema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in." } }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid", message: "Bad subscription." } }, { status: 400 });
  }
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    account_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  if (error) return NextResponse.json({ error: { code: "forbidden", message: "Could not save." } }, { status: 403 });
  return NextResponse.json({ data: { enabled: true } });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in." } }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const supabase = await createClient();
  if (body?.endpoint) await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ data: { enabled: false } });
}
