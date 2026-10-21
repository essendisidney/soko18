import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** "I'm using the app": feeds the real "active now" count. */
export async function POST() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return new NextResponse(null, { status: 204 });
  const supabase = await createClient();
  await supabase.rpc("touch_seen");
  return new NextResponse(null, { status: 204 });
}
