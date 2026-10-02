"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Clock, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { useProfileMeta } from "@/lib/profile/sync";

const DISMISS_KEY = "soko18_nudge_dismissed";

/**
 * One line at the top of Discover telling a signed-in member what to do next:
 * make a profile, finish it, or wait for review. Matching needs a profile.
 */
export function ProfileNudge() {
  const { user, ready } = useAuth();
  const draft = useDraftProfile();
  const meta = useProfileMeta();
  const photos = meta ? meta.photos : null;
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!ready || !user || hidden) return null;
  if (draft?.status === "live" || draft?.status === "paused" || draft?.status === "suspended") return null;

  const inReview = draft?.status === "pending_review";
  const steps = [
    { ok: (photos ?? 0) >= 1, label: "a photo" },
    { ok: Boolean(draft?.displayName && draft?.areaSlug), label: "your name & area" },
    { ok: Boolean(draft?.gender && draft?.lookingFor), label: "who you are & what you want" },
  ];
  const done = steps.filter((s) => s.ok).length;
  const next = steps.find((s) => !s.ok);
  if (!inReview && draft && done === steps.length && photos !== null) {
    return (
      <Bar href="/studio/profile" icon={<Sparkles className="size-4 text-bg" />} gold title="One tap to go live" line="Open your profile and tap Go live." onClose={() => close(setHidden)} />
    );
  }
  if (inReview) {
    return (
      <Bar href="/studio/profile" icon={<Clock className="size-4 text-gold" />} title="Quick check in progress" line="We’re taking a look. You’ll get a notification." onClose={() => close(setHidden)} />
    );
  }
  return (
    <Bar
      href="/studio/profile"
      icon={<Sparkles className="size-4 text-bg" />}
      gold
      title={draft ? `Go live · ${done}/${steps.length} done` : "Make your profile — about a minute"}
      line={next ? `Next: add ${next.label}. Then people near you can see you.` : "Then people near you can see you."}
      onClose={() => close(setHidden)}
    />
  );
}

function close(setHidden: (v: boolean) => void) {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {}
  setHidden(true);
}

function Bar({
  href,
  icon,
  title,
  line,
  gold,
  onClose,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  line: string;
  gold?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="relative mt-2">
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 pr-9 ${gold ? "border-gold/60 bg-gold/10" : "border-line bg-bg-elevated"}`}
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${gold ? "bg-gold" : "bg-gold/15"}`}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted">{line}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </Link>
      <button type="button" onClick={onClose} aria-label="Hide" className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-muted">
        ×
      </button>
    </div>
  );
}
