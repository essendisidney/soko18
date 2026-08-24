export const STORAGE_AUDIT = {
  bucket: "profile-media",
  public: false as const,
  signedReadsOnly: true,
  ownerFolderIsAuthUid: true,
  maxBytes: 10 * 1024 * 1024,
  mime: ["image/jpeg", "image/png", "image/webp"] as const,
};

export const ADVISOR_BASELINE = [
  { id: "rls_public", ok: true, note: "Every public table enables RLS in 00001." },
  { id: "roles_not_user_metadata", ok: true, note: "RBAC reads accounts.role and app_metadata only." },
  { id: "security_definer_private", ok: true, note: "Privileged work stays in private; public wrappers are thin." },
  { id: "storage_private", ok: true, note: "profile-media bucket is private; unapproved files are not public." },
  { id: "ledger_immutable", ok: true, note: "Ledger has no update/delete; featured requires a ledger row." },
  { id: "session_revoke", ok: true, note: "Logout, ban, and delete revoke sessions when a live project exists." },
] as const;

export function storageAudit() {
  return STORAGE_AUDIT;
}

export function advisorBaseline() {
  return {
    runnable: false,
    reason: "Run supabase db advisors when a paid project exists. Do not invent findings.",
    baseline: ADVISOR_BASELINE,
    storage: STORAGE_AUDIT,
  };
}
