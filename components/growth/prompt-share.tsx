"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { Button } from "@/components/soko/button";
import { raceUrl } from "@/lib/campus/race";
import { looksLikePaidService } from "@/lib/safety/paid-services";
import { canvasToFile, drawPromptCard } from "@/lib/share/prompt-card";
import type { ProfilePrompt } from "@/lib/profile/prompts";

function origin() {
  return (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
}

function fontVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

/** Where the image sends people: your campus race if you're a verified student, else the app. */
async function shareLink(): Promise<string> {
  try {
    const res = await fetch("/api/campus", { cache: "no-store" });
    const json = (await res.json()) as { data?: { mine?: { slug: string } | null } };
    const slug = json.data?.mine?.slug;
    return slug ? raceUrl(origin(), slug) : `${origin()}/`;
  } catch {
    return `${origin()}/`;
  }
}

/** "Share" on an answered prompt: a story-sized image with the question and answer only. */
export function PromptShareButton({ prompt }: { prompt: ProfilePrompt }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Share this prompt"
        disabled={!prompt.a.trim()}
        onClick={() => setOpen(true)}
        className="grid size-8 place-items-center rounded-full text-gold active:bg-white/10 disabled:text-muted disabled:opacity-40"
      >
        <Share2 className="size-4" />
      </button>
      {open ? <PromptShareSheet prompt={prompt} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function PromptShareSheet({
  prompt,
  onClose,
  link: fixedLink,
  title = "Share my prompt",
  kicker,
}: {
  prompt: ProfilePrompt;
  onClose: () => void;
  /** Where the image points; defaults to your campus race, or the app. */
  link?: string;
  title?: string;
  /** Heading on a question-only image. */
  kicker?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const blocked = looksLikePaidService(`${prompt.q} ${prompt.a}`);

  useEffect(() => {
    if (blocked) return;
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      const display = fontVar("--font-syne", "sans-serif");
      const body = fontVar("--font-geist-sans", "sans-serif");
      const brand = fontVar("--font-kutana", display);
      await Promise.all([
        document.fonts.load(`700 64px ${display}`),
        document.fonts.load(`600 40px ${body}`),
        document.fonts.load(`900 76px ${brand}`),
      ]).catch(() => null);
      const target = fixedLink ?? (await shareLink());
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      drawPromptCard(canvas, { question: prompt.q, answer: prompt.a, link: target, kicker, displayFont: display, bodyFont: body, brandFont: brand });
      const made = await canvasToFile(canvas);
      if (cancelled || !made) return;
      url = URL.createObjectURL(made);
      setLink(target);
      setFile(made);
      setPreview(url);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blocked, prompt.q, prompt.a, fixedLink, kicker]);

  const canShareFile = Boolean(file && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-t-[28px] border border-line bg-bg-elevated p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-xl">{title}</p>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted">
            <X className="size-5" />
          </button>
        </div>

        {blocked ? (
          <p className="mt-4 text-sm text-cream/85">
            This answer can’t be shared. Kutana is for meeting people, not for selling anything. Change the answer and try again.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted">
              {prompt.a.trim() ? "Only the question and your answer. No name, no photo." : "Just the question. Post it and let people answer."}
            </p>
            <canvas ref={canvasRef} className="hidden" />
            <div className="mx-auto mt-4 aspect-[9/16] w-44 overflow-hidden rounded-2xl border border-line bg-bg">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local blob preview, not a remote image
                <img src={preview} alt={`${prompt.q}: ${prompt.a}`} className="size-full object-cover" />
              ) : (
                <div className="shimmer size-full" />
              )}
            </div>
            <div className="mt-5 flex gap-2">
              {canShareFile ? (
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={async () => {
                    if (!file) return;
                    try {
                      await navigator.share({ files: [file], text: `${prompt.a.trim() ? "What’s yours?" : prompt.q} ${link}` });
                    } catch {
                      // Closing the share sheet is not an error.
                    }
                  }}
                >
                  <Share2 className="mr-2 size-4" /> Share to Status
                </Button>
              ) : null}
              <a
                href={preview ?? undefined}
                download="kutana-prompt.png"
                aria-disabled={!preview}
                onClick={() => setNote("Saved. Post it to your WhatsApp Status or story.")}
                className={canShareFile ? "shrink-0" : "flex-1"}
              >
                <Button variant={canShareFile ? "ghost" : "gold"} className="w-full" disabled={!preview}>
                  <Download className="mr-2 size-4" /> Save image
                </Button>
              </a>
            </div>
            {note ? (
              <p role="status" className="mt-3 text-center text-xs text-muted">
                {note}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
