import { NextResponse } from "next/server";
import { listMatches } from "@/lib/likes/list";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in to see matches." } },
      { status: 401 },
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in to see matches." } },
      { status: 401 },
    );
  }

  const items = await listMatches();
  return NextResponse.json({ data: { items } });
}
