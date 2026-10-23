import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const none = () => NextResponse.json({ data: null }, { status: 404 });

/**
 * A short-lived link to a profile's approved voice intro. The database decides whether this
 * viewer may hear it (approved, live, not hidden from them); only then does the server sign it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  if (!UUID.test(profileId) || !isSupabaseConfigured()) return none();
  const supabase = await createClient();
  const { data: path } = await supabase.rpc("profile_voice_path", { p_profile: profileId });
  const admin = createServiceClient();
  if (!path || !admin) return none();
  const { data } = await admin.storage.from("voice").createSignedUrl(path as string, 600);
  if (!data?.signedUrl) return none();
  return NextResponse.json({ data: { url: data.signedUrl } }, { headers: { "Cache-Control": "private, no-store" } });
}
