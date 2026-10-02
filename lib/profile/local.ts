import type { ProfileDraft } from "@/lib/profile/types";

export const DRAFT_KEY = "soko18_profile_draft";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listen) => listen());
}

export function readLocalDraft(): ProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProfileDraft;
  } catch {
    return null;
  }
}

export function writeLocalDraft(draft: ProfileDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  emit();
}

export function subscribeLocalDraft(onChange: () => void) {
  listeners.add(onChange);
  function handle(event: StorageEvent) {
    if (event.key === DRAFT_KEY || event.key === "soko18_profile_meta") onChange();
  }
  window.addEventListener("storage", handle);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handle);
  };
}

export function draftSnapshot() {
  return localStorage.getItem(DRAFT_KEY);
}

export function clearLocalDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
  emit();
}

/** Server facts the editor and nudges need: approved photo count and why a profile is held. */
export const META_KEY = "soko18_profile_meta";
export type ProfileMeta = { photos: number; coverUrl?: string | null; heldReason: string | null; syncedAt: number };

export function writeProfileMeta(meta: ProfileMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
  emit();
}

export function metaSnapshot() {
  try {
    return localStorage.getItem(META_KEY);
  } catch {
    return null;
  }
}
