import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function currentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: account } = await supabase
    .from("accounts")
    .select("is_banned, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (account?.is_banned || account?.deleted_at) {
    await supabase.auth.signOut({ scope: "global" });
    return null;
  }

  return user;
}
