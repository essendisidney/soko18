"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/soko/button";
import { resizeImage } from "@/lib/media/resize";
import { createClient } from "@/lib/supabase/client";

type Photo = { id: string; url: string | null; status: string; isCover: boolean; reason: string | null };

const MAX = 6;

const statusLabel: Record<string, string> = {
  uploaded: "In review",
  scanning: "In review",
  pending_review: "In review",
  approved: "Approved",
  rejected: "Not approved",
};

/** Real photo uploads to the member's private storage folder. Staff approve before anything is public. */
export function RemotePhotos({
  userId,
  ensureProfile,
}: {
  userId: string;
  ensureProfile?: () => Promise<boolean>;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    void fetch("/api/media/mine")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { items: Photo[] } } | null) => setPhotos(json?.data?.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (photos.length >= MAX) {
      setNote("Six photos is the limit.");
      return;
    }
    setBusy(true);
    setNote("Saving…");
    // The gallery opens straight from the tap; the profile draft is made after a photo is picked.
    if (ensureProfile && !(await ensureProfile())) {
      setBusy(false);
      setNote("Pick your area below first, then add the photo again.");
      return;
    }
    setNote("Uploading…");
    let blob: Blob;
    try {
      blob = await resizeImage(file);
    } catch {
      setBusy(false);
      setNote("That photo couldn’t be read. Try a JPG or PNG from your gallery.");
      return;
    }
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("profile-media")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) {
      setBusy(false);
      setNote("Upload failed. Check your connection and try again.");
      return;
    }
    const res = await fetch("/api/media/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok) {
      setNote(json?.error?.message ?? "Could not save photo.");
      return;
    }
    setNote("Uploaded. We review every photo before it shows.");
    load();
  }

  return (
    <div>
      <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Photos</p>
      <p className="mt-2 text-xs text-muted">Add at least 2. Clear photos of your face get the most matches. We check each one first.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : null}
              {photo.isCover ? (
                <span className="absolute top-1 left-1 rounded-full bg-black/60 px-1.5 text-[9px] text-gold">MAIN</span>
              ) : null}
            </div>
            <p className="mt-1 text-[10px] text-muted">{statusLabel[photo.status] ?? photo.status}</p>
            {photo.reason ? <p className="text-[10px] text-muted">{photo.reason}</p> : null}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3"
        disabled={busy || photos.length >= MAX}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading…" : "Add photo"}
      </Button>
      {note ? <p className="mt-2 text-sm text-cream/90">{note}</p> : null}
    </div>
  );
}
