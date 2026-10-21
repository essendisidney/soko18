import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Once a day: count the streak and pay out a streak gift if one is due. */
export async function POST() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return NextResponse.json({ data: null });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_today");
  if (error) return NextResponse.json({ data: null });
  return NextResponse.json({ data });
}
