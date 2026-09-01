"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { InstallHome } from "@/components/pwa/install-home";
import { accountRole, useAuth } from "@/lib/auth/use-auth";
import { isStaffRole } from "@/lib/admin/roles";
import { signOutAction } from "@/lib/auth/actions";
import { areaUrl, nairobiUrl, shareProfile } from "@/lib/profile/share";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { areaBySlug } from "@/lib/data/nairobi";
import { nearAreaSnapshot, subscribeNearArea } from "@/lib/nairobi/near";
import { HereNowButton } from "@/components/presence/here-now";
import { readIncognito } from "@/lib/privacy/local";

const rows = [
  { href: "/saved", label: "Saved" },
  { href: "/notify", label: "Notify me" },
  { href: "/intent", label: "Looking for" },
  { href: "/studio", label: "SOKO18 Studio" },
  { href: "/invite", label: "Friend pass" },
  { href: "/admin", label: "Admin" },
  { href: "/settings", label: "Settings" },
  { href: "/safety", label: "Safety" },
  { href: "/blocked", label: "Blocked" },
  { href: "/onboarding/city", label: "Other cities" },
];

export default function MePage() {
  const { user, ready, configured } = useAuth();
  const role = accountRole(user);
  const draft = useDraftProfile();
  const [gate, setGate] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [ghost, setGhost] = useState(false);
  const router = useRouter();
  const near = useSyncExternalStore(subscribeNearArea, nearAreaSnapshot, () => null);
  const place = near ? areaBySlug(near) : null;
  const shareName = place?.name ?? "Nairobi";
  const shareHref = place ? areaUrl(place.slug) : nairobiUrl();

  useEffect(() => {
    setGhost(readIncognito());
  }, []);

  return (
    <div className="pb-8">
      <Wordmark />
      <h1 className="mt-4 font-display text-[34px] tracking-tight">Me</h1>
      <p className="mt-2 text-sm text-muted">
        {user ? "Account, safety, and business tools." : "Discovering as a guest."}
      </p>
      {ghost ? <p className="mt-2 text-xs text-gold">You’re invisible</p> : null}
      <HereNowButton />

      {ready && user ? (
        <div className="mt-6 rounded-3xl border border-line px-5 py-4">
          <p className="text-sm">{user.email}</p>
          {role ? <p className="mt-1 text-xs text-muted">{role}</p> : null}
          <form action={signOutAction} className="mt-4">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <Link href="/login?next=/me">
            <Button className="w-full" variant="gold">
              Sign in
            </Button>
          </Link>
          <Link href="/signup?next=/me">
            <Button className="w-full" variant="ghost">
              Create account
            </Button>
          </Link>
          {!configured ? (
            <p className="text-xs leading-relaxed text-muted">
              Accounts open when the backend is connected. Guest discover stays open.
            </p>
          ) : null}
        </div>
      )}

      <InstallHome />

      <div className="mt-6">
        {draft?.status === "pending_review" ? (
          <Link href="/studio/profile">
            <Button className="w-full" variant="ghost">
              In review
            </Button>
          </Link>
        ) : draft ? (
          <Link href="/studio/profile">
            <Button className="w-full" variant="ghost">
              Edit profile
            </Button>
          </Link>
        ) : (
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => {
              if (configured && ready && !user) {
                setGate(true);
                return;
              }
              router.push("/studio/profile");
            }}
          >
            Create profile
          </Button>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-line">
        <button
          type="button"
          className="flex w-full scroll-mb-28 items-center justify-between border-b border-line px-5 py-4 text-left"
          onClick={() => {
            void shareProfile(shareName, shareHref).then((result) => {
              setShareNotice(
                result === "copied" ? "Link copied." : result === "shared" ? "Shared." : "Couldn’t share.",
              );
            });
          }}
        >
          Share {shareName}
          <ChevronRight className="size-4 text-muted" />
        </button>
        {rows
          .filter((row) => row.href !== "/admin" || isStaffRole(role))
          .map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="flex scroll-mb-28 items-center justify-between border-b border-line px-5 py-4 last:border-b-0"
          >
            {row.label}
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
      </div>
      {shareNotice ? <p className="mt-3 text-xs text-muted">{shareNotice}</p> : null}
      <p className="mt-8 text-xs leading-relaxed text-muted">
        SOKO18 is 18+. Report, block, and privacy controls are always available from a profile or thread.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
      <AnimatePresence>
        {gate ? <AuthGate intent="profile" onClose={() => setGate(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}
