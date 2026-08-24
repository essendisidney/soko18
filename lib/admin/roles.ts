export const STAFF_ROLES = ["moderator", "admin", "support"] as const;

export function isStaffRole(role: string | null | undefined) {
  return role === "moderator" || role === "admin" || role === "support";
}
