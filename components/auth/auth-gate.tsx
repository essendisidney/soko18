"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";

export type AuthIntent = "like" | "spotlight" | "message" | "profile" | "report" | "panic" | "share" | "rate" | "verify";

const copy: Record<AuthIntent, { title: string; line: string }> = {
  like: { title: "Sign in to like", line: "Pass stays open. Likes need an account." },
  spotlight: { title: "Sign in to Spotlight", line: "A Spotlight is a real signal. It needs you." },
  message: { title: "Sign in to message", line: "You can keep browsing Nairobi as a guest." },
  profile: { title: "Sign in to continue", line: "Create a profile once you’re in." },
  report: { title: "Sign in to report", line: "A report opens a staff case. You can keep browsing." },
  panic: { title: "Sign in to send a panic alert", line: "The alert goes to your trusted contact only." },
  share: { title: "Sign in to share location", line: "Live location goes to your trusted contact only." },
  rate: { title: "Sign in to rate", line: "Reviews are two-way after a match." },
  verify: { title: "Sign in to verify ID", line: "Identity review is both sides. No ID number in the app." },
};

export function AuthGate({
  intent,
  onClose,
  onDiscover,
}: {
  intent: AuthIntent;
  onClose: () => void;
  onDiscover?: () => void;
}) {
  const pathname = usePathname();
  const next = encodeURIComponent(pathname || "/discover");
  const text = copy[intent];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Wordmark size="sm" />
      <p className="mt-10 font-display text-[13px] tracking-[0.28em] text-gold">SOKO18</p>
      <h2 className="mt-4 font-display text-4xl tracking-tight">{text.title}</h2>
      <p className="mt-4 max-w-xs text-sm text-muted">{text.line}</p>
      <Link href={`/login?next=${next}`} className="mt-10 w-full max-w-xs">
        <Button className="w-full" variant="gold">
          Continue
        </Button>
      </Link>
      <Link
        href="/discover"
        className="mt-4 block w-full max-w-xs"
        onClick={() => (onDiscover ?? onClose)()}
      >
        <Button className="w-full" variant="ghost">
          Discover
        </Button>
      </Link>
      <button type="button" onClick={onClose} className="mt-5 text-sm text-muted">
        Not now
      </button>
    </motion.div>
  );
}
