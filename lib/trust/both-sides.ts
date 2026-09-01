export type IdentityState = "none" | "pending" | "verified" | "rejected";

export function bothSidesReady(themIdentity: boolean, you: IdentityState) {
  return themIdentity && you === "verified";
}

/** Extra photos unmask after both IDs. Chat and live proof stay. */
export function canUnmask(themIdentity: boolean, you: IdentityState) {
  return bothSidesReady(themIdentity, you);
}

export function unmaskLine(themIdentity: boolean, you: IdentityState) {
  if (canUnmask(themIdentity, you)) return "Unmasked. ID on both sides.";
  return "ID both sides to unmask extra photos. Live proof stays in this thread.";
}

export function bothSidesLine(themIdentity: boolean, you: IdentityState) {
  const youOk = you === "verified";
  if (themIdentity && youOk) return "ID verified on both sides.";
  if (themIdentity && you === "pending") return "They verified. Yours is in review.";
  if (themIdentity && you === "rejected") return "They verified. Submit your ID again.";
  if (themIdentity) return "They verified. Submit your ID.";
  if (youOk) return "You’re verified. They are not.";
  if (you === "pending") return "Your ID is in review. They are not verified.";
  return "Neither of you is ID verified yet.";
}
