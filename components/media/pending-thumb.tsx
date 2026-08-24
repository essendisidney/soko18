"use client";

import { useEffect, useState } from "react";
import { getMediaBlob } from "@/lib/media/blobs";

export function PendingThumb({ id, label }: { id: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    getMediaBlob(id)
      .then((blob) => {
        if (!alive || !blob) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (!src) {
    return (
      <div className="grid aspect-[3/4] place-items-center rounded-2xl border border-line bg-glass text-xs text-muted">
        {label}
      </div>
    );
  }

  return (
    // Owner/admin preview only. Never passed to Discover or public profile.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
  );
}
