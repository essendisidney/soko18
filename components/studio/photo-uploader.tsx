"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/soko/button";
import { PendingThumb } from "@/components/media/pending-thumb";
import { putMediaBlob } from "@/lib/media/blobs";
import { upsertMedia } from "@/lib/media/store";
import { useMediaQueue } from "@/lib/media/use-queue";
import type { MediaItem } from "@/lib/media/types";

const MAX = 6;

export function PhotoUploader({
  profileId,
  profileName,
  area,
}: {
  profileId?: string;
  profileName: string;
  area: string;
}) {
  const items = useMediaQueue().filter((item) => item.profileId === profileId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function onFiles(list: FileList | null) {
    if (!profileId || !list?.length) {
      setNote("Save the draft first.");
      return;
    }
    if (items.length >= MAX) {
      setNote("Six photos is the limit.");
      return;
    }

    setBusy(true);
    setNote("");
    const file = list[0];

    const upload = await fetch("/api/media/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type }),
    });
    const uploaded = await upload.json();
    if (!upload.ok) {
      setBusy(false);
      setNote(uploaded.error?.message ?? "Upload failed.");
      return;
    }

    const complete = await fetch("/api/media/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId: uploaded.data.mediaId,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });
    const done = await complete.json();
    setBusy(false);
    if (!complete.ok) {
      setNote(done.error?.message ?? "Scan failed.");
      return;
    }

    const item: MediaItem = {
      id: uploaded.data.mediaId,
      profileId,
      profileName,
      area: area || "Nairobi",
      path: uploaded.data.path,
      status: "pending_review",
      isCover: items.length === 0,
      sortOrder: items.length,
      fileName: file.name,
      flagged: Boolean(done.data.flagged),
      createdAt: new Date().toISOString(),
    };
    await putMediaBlob(item.id, file);
    upsertMedia(item);
    setNote("In review. Not public.");
  }

  return (
    <div>
      <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Photos</p>
      <p className="mt-2 text-xs text-muted">Nothing publishes until SOKO18 approves it.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.id}>
            <PendingThumb id={item.id} label={item.status === "approved" ? "Approved" : "Review"} />
            <p className="mt-1 text-[10px] text-muted">
              {item.status === "approved" ? "Approved" : item.flagged ? "Flagged" : "In review"}
            </p>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          void onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3"
        disabled={busy || !profileId || items.length >= MAX}
        onClick={() => {
          if (!profileId) {
            setNote("Save the draft first.");
            return;
          }
          inputRef.current?.click();
        }}
      >
        {busy ? "Scanning…" : "Add photo"}
      </Button>
      {note ? <p className="mt-2 text-sm text-cream/90">{note}</p> : null}
    </div>
  );
}
