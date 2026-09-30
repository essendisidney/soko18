import { currentUser } from "@/lib/auth/user";
import { isStaffRole } from "@/lib/admin/roles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type StaffAuth =
  | { ok: true; userId: string; role: string }
  | { ok: false; status: number; error: { code: string; message: string } };

export async function requireStaff(): Promise<StaffAuth> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 401, error: { code: "unauthorized", message: "Sign in as staff." } };
  }
  const user = await currentUser();
  if (!user) {
    return { ok: false, status: 401, error: { code: "unauthorized", message: "Sign in as staff." } };
  }

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("role, is_banned, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!account || account.is_banned || account.deleted_at) {
    return { ok: false, status: 403, error: { code: "forbidden", message: "Staff only." } };
  }

  const role = typeof account.role === "string" ? account.role : null;
  if (!role || !isStaffRole(role)) {
    return { ok: false, status: 403, error: { code: "forbidden", message: "Staff only." } };
  }

  // Staff who turned on 2-step sign-in must have entered their code this session.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return { ok: false, status: 403, error: { code: "mfa_required", message: "Enter your 2-step code first." } };
  }

  return { ok: true, userId: user.id, role };
}
