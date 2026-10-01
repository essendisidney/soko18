import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { makeMainPhoto, removeMyPhoto } from "@/lib/media/remote";

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

/** Owner: remove one of your photos. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await removeMyPhoto(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

/** Owner: { main: true } makes this the main photo. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { main?: boolean } | null;
  if (!body?.main) {
    return NextResponse.json({ error: { code: "invalid", message: "Nothing to change." } }, { status: 400 });
  }
  const result = await makeMainPhoto(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
