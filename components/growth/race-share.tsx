"use client";

import { useState } from "react";
import { Link2, MessageCircle } from "lucide-react";
import { whatsappHref } from "@/lib/campus/race";

/** WhatsApp first (that's where students are), copy link as the fallback. */
export function RaceShare({ text, url, compact = false }: { text: string; url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={compact ? "flex items-center gap-1.5" : "flex items-center gap-2"}>
      <a
        href={whatsappHref(text)}
        target="_blank"
        rel="noopener noreferrer"
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-2.5 py-1 text-[11px] font-medium text-[#25D366]"
            : "inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-black"
        }
      >
        <MessageCircle className={compact ? "size-3.5" : "size-4"} aria-hidden />
        {compact ? "Share" : "Share on WhatsApp"}
      </a>
      <button
        type="button"
        aria-label="Copy link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted"
            : "inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-3 text-sm text-cream/85"
        }
      >
        <Link2 className={compact ? "size-3.5" : "size-4"} aria-hidden />
        {copied ? "Copied" : compact ? "" : "Copy link"}
      </button>
    </div>
  );
}
