"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/soko/button";
import { resizeImage } from "@/lib/media/resize";
import { createClient } from "@/lib/supabase/client";
import { refreshMyProfile } from "@/lib/profile/sync";

type Photo = { id: string; url: string | null; status: string; isCover: boolean; reason: string | null };

const MAX = 6;

const statusLabel: Record<string, string> = {
  uploaded: "Checking",
  scanning: "Checking",
  pending_review: "Checking",
  approved: "",
  rejected: "Removed by us",
};

/** Real photo uploads to the member's storage folder. They show straight away; we check them after. */
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
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
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
    setNote(photos.length === 0 ? "Nice — that’s your main photo." : "Added.");
    load();
    void refreshMyProfile();
  }

  async function remove(id: string) {
    setBusy(true);
    setNote("");
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    setConfirm(null);
    setSelected(null);
    if (!res.ok) {
      setNote(json?.error?.message ?? "Couldn’t remove that photo.");
      return;
    }
    setPhotos((list) => list.filter((p) => p.id !== id));
    setNote("Photo removed.");
    load();
    void refreshMyProfile();
  }

  async function makeMain(id: string) {
    setBusy(true);
    setNote("");
    const res = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ main: true }),
    });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    setSelected(null);
    if (!res.ok) {
      setNote(json?.error?.message ?? "Couldn’t change your main photo.");
      return;
    }
    setNote("Main photo updated.");
    load();
  }

  const empty = Math.max(0, MAX - photos.length);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Photos</p>
        <p className="text-xs text-muted">{photos.length}/{MAX}</p>
      </div>
      <p className="mt-2 text-xs text-muted">
        One photo gets you live. Three or more clear face photos get the most matches. Tap a photo to make it main or remove it.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative">
            <button
              type="button"
              onClick={() => setSelected(selected === photo.id ? null : photo.id)}
              className={`relative block aspect-[3/4] w-full overflow-hidden rounded-2xl bg-white/5 ${
                selected === photo.id ? "ring-2 ring-gold" : ""
              }`}
              aria-label={photo.isCover ? "Main photo, tap for options" : "Photo, tap for options"}
            >
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : null}
              {photo.isCover ? (
                <span className="absolute top-1.5 left-1.5 rounded-full bg-gold px-2 py-0.5 text-[9px] font-semibold text-bg">MAIN</span>
              ) : null}
              {statusLabel[photo.status] ? (
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 text-left text-[10px] text-cream/90">
                  {statusLabel[photo.status]}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm(photo.id)}
              aria-label="Remove photo"
              className="absolute -top-1.5 -right-1.5 grid size-7 place-items-center rounded-full border border-line bg-bg text-cream shadow-md"
            >
              <X className="size-3.5" />
            </button>
            {photo.reason ? <p className="mt-1 text-[10px] text-muted">{photo.reason}</p> : null}
          </div>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-label="Add photo"
            className="grid aspect-[3/4] w-full place-items-center rounded-2xl border border-dashed border-line text-muted transition-colors active:bg-white/5"
          >
            {i === 0 ? (
              <span className="flex flex-col items-center gap-1 text-xs">
                <span className="grid size-9 place-items-center rounded-full bg-gold text-bg">
                  <Plus className="size-5" />
                </span>
                {busy ? "Uploading…" : "Add photo"}
              </span>
            ) : (
              <Plus className="size-5 opacity-50" />
            )}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mt-3 flex gap-2">
          {!photos.find((p) => p.id === selected)?.isCover ? (
            <Button type="button" variant="gold" size="sm" className="flex-1" disabled={busy} onClick={() => void makeMain(selected)}>
              <Star className="size-4" /> Make main
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" className="flex-1" disabled={busy} onClick={() => setConfirm(selected)}>
            <Trash2 className="size-4" /> Remove
          </Button>
        </div>
      ) : null}

      {confirm ? (
        <div className="mt-3 rounded-2xl border border-line bg-bg-elevated p-4 text-sm">
          <p>Remove this photo? This can’t be undone.</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="danger" size="sm" className="flex-1" disabled={busy} onClick={() => void remove(confirm)}>
              {busy ? "Removing…" : "Remove"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={() => setConfirm(null)}>
              Keep
            </Button>
          </div>
        </div>
      ) : null}

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
      {note ? <p className="mt-2 text-sm text-cream/90">{note}</p> : null}
    </div>
  );
}
