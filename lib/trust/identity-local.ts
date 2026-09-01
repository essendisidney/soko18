import type { IdentityState } from "@/lib/trust/both-sides";

export const IDENTITY_KEY = "soko18_identity_status";

export function readIdentityState(): IdentityState {
  if (typeof window === "undefined") return "none";
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw === "pending" || raw === "verified" || raw === "rejected" || raw === "none") return raw;
    return "none";
  } catch {
    return "none";
  }
}

export function writeIdentityState(state: IdentityState) {
  localStorage.setItem(IDENTITY_KEY, state);
}
