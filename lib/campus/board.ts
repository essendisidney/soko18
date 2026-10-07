import { createClient as createSupabase } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { CampusBoardRow } from "@/lib/campus/shared";

/**
 * The public campus-vs-campus board (real verified counts). No session needed, so it also
 * works in link-preview images. Empty when Supabase isn't configured or the call fails.
 */
export async function publicCampusBoard(): Promise<CampusBoardRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("campus_board");
  if (error) return [];
  return (data as CampusBoardRow[] | null) ?? [];
}
