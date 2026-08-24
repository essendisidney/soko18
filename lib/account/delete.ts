import { currentUser } from "@/lib/auth/user";
import { revokeOwnSessions } from "@/lib/auth/revoke";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function deleteOwnAccount() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to delete your account." } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("soft_delete_own_account");
  if (error || !data) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not delete this account." } };
  }

  await revokeOwnSessions();
  return { ok: true as const, data: { deleted: true, sessionsRevoked: true } };
}
