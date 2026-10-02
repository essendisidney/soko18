"use client";

import { useSyncExternalStore } from "react";
import type { ProfileDraft } from "@/lib/profile/types";
import {
  clearLocalDraft,
  metaSnapshot,
  subscribeLocalDraft,
  writeLocalDraft,
  writeProfileMeta,
  type ProfileMeta,
} from "@/lib/profile/local";

let inflight: Promise<void> | null = null;

/** Pull the member's real profile (status, photos) from the server into the local copy every screen reads. */
export function refreshMyProfile() {
  if (inflight) return inflight;
  inflight = fetch("/api/profiles/mine", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return;
      const json = (await res.json()) as {
        data?: { profile: ProfileDraft | null; photos: number; coverUrl: string | null; heldReason: string | null };
      };
      if (!json.data) return;
      if (json.data.profile) writeLocalDraft(json.data.profile);
      else clearLocalDraft();
      writeProfileMeta({
        photos: json.data.photos,
        coverUrl: json.data.coverUrl,
        heldReason: json.data.heldReason,
        syncedAt: Date.now(),
      });
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useProfileMeta(): ProfileMeta | null {
  const raw = useSyncExternalStore(subscribeLocalDraft, metaSnapshot, () => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProfileMeta;
  } catch {
    return null;
  }
}
