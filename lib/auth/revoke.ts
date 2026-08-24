import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function revokeUserSessions(userId: string, currentJwt?: string | null) {
  const service = createServiceClient();
  if (service) {
    await service.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    return { revoked: true as const, via: "admin" as const };
  }

  if (isSupabaseConfigured() && currentJwt) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
    return { revoked: true as const, via: "global" as const };
  }

  return { revoked: false as const, via: "none" as const };
}

export async function revokeOwnSessions() {
  if (!isSupabaseConfigured()) return { revoked: false as const };
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  return { revoked: true as const };
}
