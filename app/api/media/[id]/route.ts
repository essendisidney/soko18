import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profile_media")
      .select("id, status")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();

    if (data) {
      return NextResponse.json({ data: { id: data.id, status: "approved" } });
    }
  }

  return NextResponse.json(
    { error: { code: "media_pending", message: "This photo isn’t public." } },
    { status: 404 },
  );
}
