"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { InstallHome } from "@/components/pwa/install-home";
import { accountRole, useAuth } from "@/lib/auth/use-auth";
import { isStaffRole } from "@/lib/admin/roles";
import { signOutAction } from "@/lib/auth/actions";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { readIncognito } from "@/lib/privacy/local";

const groups: { title: string; rows: { href: string; label: string }[] }[] = [
  {
    title: "Dating",
    rows: [
      { href: "/likes", label: "Likes you" },
      { href: "/saved", label: "Saved" },
      { href: "/intent", label: "What I’m looking for" },
    ],
  },
  {
    title: "Account",
    rows: [
      { href: "/settings", label: "Settings & privacy" },
      { href: "/safety", label: "Safety & verification" },
      { href: "/blocked", label: "Blocked" },
      { href: "/invite", label: "Invite a friend" },
      { href: "/admin", label: "Admin" },
    ],
  },
];

export default function MePage() {
  const { user, ready, configured } = useAuth();
  const role = accountRole(user);
  const draft = useDraftProfile();
  const [gate, setGate] = useState(false);
  const [ghost, setGhost] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setGhost(readIncognito());
  }, []);

  const health = draft
    ? Math.round(
        ([draft.displayName, draft.birthYear, draft.areaSlug, draft.bio, draft.gender, draft.lookingFor].filter(Boolean)
          .length /
          6) *
          100,
      )
    : 0;

  return (
    <div className="pb-8">
      <Wordmark size="sm" />
      <h1 className="mt-5 font-display text-[34px] leading-none tracking-tight">Me</h1>
      {ghost ? <p className="mt-2 text-xs text-gold">You’re in Incognito</p> : null}

      <section className="mt-6 rounded-3xl border border-line p-5">
        {draft ? (
          <>
            <p className="font-display text-2xl">{draft.displayName || "Your profile"}</p>
            <p className="mt-1 text-sm text-muted">
              {draft.status === "pending_review" ? "In review — live soon" : `${health}% complete · not live yet`}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gold" style={{ width: `${draft.status === "pending_review" ? 100 : health}%` }} />
            </div>
            <Link href="/studio/profile" className="mt-4 block">
              <Button className="w-full" variant={health < 100 ? "gold" : "ghost"}>
                {health < 100 ? "Finish your profile" : "Edit profile"}
              </Button>
            </Link>
          </>
        ) : (
          <>
            <p className="font-display text-2xl">Create your profile</p>
            <p className="mt-1 text-sm text-muted">Photos, a line about you, and you’re ready to match.</p>
            <Button
              className="mt-4 w-full"
              variant="gold"
              onClick={() => {
                if (configured && ready && !user) {
                  setGate(true);
                  return;
                }
                router.push("/studio/profile");
              }}
            >
              Get started
            </Button>
          </>
        )}
      </section>

      <Link href="/upgrade" className="mt-3 block rounded-3xl border border-gold/60 p-5">
        <p className="font-display text-xl text-gold">SOKO18 Gold</p>
        <p className="mt-1 text-sm text-muted">See who likes you and swipe without limits. From KES 149 a week.</p>
      </Link>

      {ready && user ? (
        <div className="mt-3 flex items-center justify-between rounded-3xl border border-line px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm">{user.email}</p>
            {role && role !== "seeker" ? <p className="mt-0.5 text-xs text-muted">{role}</p> : null}
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-3">
          <Link href="/login?next=/me">
            <Button className="w-full" variant="ghost">
              Sign in
            </Button>
          </Link>
          <Link href="/signup?next=/me" className="mt-3 block text-center text-sm text-muted">
            New here? Create an account
          </Link>
          {!configured ? (
            <p className="mt-2 text-center text-xs text-muted">Sign-up isn’t open yet. Keep browsing as a guest.</p>
          ) : null}
        </div>
      )}

      <InstallHome />

      {groups.map((group) => (
        <section key={group.title} className="mt-8">
          <h2 className="px-1 text-[11px] tracking-[0.18em] text-muted uppercase">{group.title}</h2>
          <div className="mt-2 overflow-hidden rounded-3xl border border-line">
            {group.rows
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
        </section>
      ))}
      <p className="mt-8 text-xs leading-relaxed text-muted">
        SOKO18 is 18+. You can report or block anyone from their profile or your chat.
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
