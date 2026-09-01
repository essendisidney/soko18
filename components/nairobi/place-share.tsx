"use client";

import Link from "next/link";
import { useState } from "react";
import { shareProfile } from "@/lib/profile/share";

export function PlaceShare({
  backHref,
  backLabel,
  shareName,
  path,
  shareLabel = "Share",
}: {
  backHref?: string;
  backLabel?: string;
  shareName: string;
  path: string;
  shareLabel?: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <div className="mt-10 flex items-center justify-between">
        {backHref && backLabel ? (
          <Link href={backHref} className="text-sm text-muted">
            {backLabel}
          </Link>
        ) : (
          <p className="text-sm text-muted">{shareName}</p>
        )}
        <button
          type="button"
          className="text-sm text-cream/80"
          onClick={() => {
            const url = `${window.location.origin}${path}`;
            void shareProfile(shareName, url).then((result) => {
              setNotice(result === "copied" ? "Link copied." : result === "failed" ? "Couldn’t share." : null);
            });
          }}
        >
          {shareLabel}
        </button>
      </div>
      {notice ? <p className="mt-3 text-xs text-muted">{notice}</p> : null}
    </>
  );
}
