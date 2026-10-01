"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";
import { guestBrowseLine } from "@/lib/auth/guest";
import { citySnapshot, subscribeNearArea } from "@/lib/nairobi/near";

export type AuthIntent = "like" | "super" | "message" | "profile" | "report" | "panic" | "share" | "verify" | "upgrade";

const copy: Record<AuthIntent, { title: string; line: string }> = {
  like: { title: "Sign in to like", line: "Pass stays open. Likes need an account." },
  super: { title: "Sign in to Super Like", line: "A Super Like shows them you’re keen before they swipe." },
  message: { title: "Sign in to message", line: guestBrowseLine() },
  profile: { title: "Sign in to continue", line: "Create a profile once you’re in." },
  report: { title: "Sign in to report", line: "A report opens a staff case. You can keep browsing." },
  panic: { title: "Sign in to send a panic alert", line: "The alert goes to your trusted contact only." },
  share: { title: "Sign in to share location", line: "Live location goes to your trusted contact only." },
  upgrade: { title: "Sign in to upgrade", line: "Gold and Platinum are tied to your account." },
  verify: { title: "Sign in to verify ID", line: "Everyone on Kutana verifies. We never show your ID number." },
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
  const citySlug = useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");
  const next = encodeURIComponent(pathname || "/discover");
  const text = intent === "message" ? { ...copy.message, line: guestBrowseLine(citySlug) } : copy[intent];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Wordmark size="sm" />
      <h2 className="mt-10 font-display text-4xl tracking-tight">{text.title}</h2>
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
