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
    if (event.key === DRAFT_KEY) onChange();
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
