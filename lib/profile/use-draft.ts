"use client";

import { useSyncExternalStore } from "react";
import type { ProfileDraft } from "@/lib/profile/types";
import { draftSnapshot, subscribeLocalDraft } from "@/lib/profile/local";

function parse(raw: string | null): ProfileDraft | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfileDraft;
  } catch {
    return null;
  }
}

export function useDraftProfile() {
  const raw = useSyncExternalStore(subscribeLocalDraft, draftSnapshot, () => null);
  return parse(raw);
}
