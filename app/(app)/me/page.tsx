"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Crown, Gift, GraduationCap, Heart, Pencil, Settings, ShieldCheck, Star, Zap } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { InstallHome } from "@/components/pwa/install-home";
import { accountRole, useAuth } from "@/lib/auth/use-auth";
import { isStaffRole } from "@/lib/admin/roles";
import { signOutAction } from "@/lib/auth/actions";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { useProfileMeta } from "@/lib/profile/sync";
import { missingToGoLive } from "@/lib/profile/ready";
import { cityNameBySlug } from "@/lib/geo/kenya";
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

  const meta = useProfileMeta();
  const missing = draft ? missingToGoLive(draft, meta?.photos ?? 0) : [];
  const live = draft?.status === "live";
  const checking = draft?.status === "pending_review";
  const health = live ? 100 : draft ? Math.round(((5 - missing.length) / 5) * 100) : 0;

  return (
    <div className="pb-8">
      <header className="flex items-center justify-between">
        <Wordmark size="sm" />
        <Link href="/settings" aria-label="Settings" className="grid size-10 place-items-center rounded-full border border-line text-muted">
          <Settings className="size-[18px]" />
        </Link>
      </header>

      <section className="mt-6 flex flex-col items-center text-center">
        <button
          type="button"
          className="relative"
          aria-label={draft ? "Edit profile" : "Create your profile"}
          onClick={() => {
            if (!draft && configured && ready && !user) {
              setGate(true);
              return;
            }
            router.push("/studio/profile");
          }}
        >
          <CompletionRing percent={health} />
          <span className="absolute inset-[9px] grid place-items-center overflow-hidden rounded-full bg-bg-elevated font-display text-4xl text-gold">
            {meta?.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.coverUrl} alt="Your main photo" className="h-full w-full object-cover" />
            ) : (
              (draft?.displayName || user?.email || "?").slice(0, 1).toUpperCase()
            )}
          </span>
          <span
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              live ? "bg-emerald-400 text-bg" : "bg-gold text-bg"
            }`}
          >
            {!draft ? "New" : live ? "● Live" : checking ? "Checking" : draft.status === "paused" ? "Paused" : `${health}%`}
          </span>
        </button>
        <h1 className="mt-5 font-display text-[28px] leading-none tracking-tight">
          {draft?.displayName || "Your profile"}
          {draft?.birthYear ? <span className="text-cream/70">, {new Date().getFullYear() - draft.birthYear}</span> : null}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {!draft
            ? "Add a photo and a few details — you’re live in about a minute."
            : live
              ? `You’re live in ${cityNameBySlug(draft.citySlug)}. People near you can see you.`
              : checking
                ? "We’re taking a quick look. You’ll get a notification."
                : draft.status === "paused"
                  ? "Paused — you’re hidden from Discover."
                  : draft.status === "suspended"
                    ? "Your profile was taken down."
                    : missing.length
                      ? `Add ${missing.join(", ")} to go live.`
                      : "All set — open your profile and tap Go live."}
        </p>
        {ghost ? <p className="mt-1 text-xs text-gold">You’re in Incognito</p> : null}
        {live && draft?.slug ? (
          <Link href={`/profile/${draft.slug}`} className="mt-2 text-xs text-gold underline-offset-4 hover:underline">
            See how others see you
          </Link>
        ) : null}
        <div className="mt-4 flex w-full max-w-xs gap-2">
          <Button
            className="flex-1"
            variant={!live ? "gold" : "ghost"}
            size="md"
            onClick={() => {
              if (!draft && configured && ready && !user) {
                setGate(true);
                return;
              }
              router.push("/studio/profile");
            }}
          >
            <Pencil className="size-4" /> {!draft ? "Create profile" : live ? "Edit profile" : "Finish profile"}
          </Button>
          <Link href="/safety" className="flex-1">
            <Button className="w-full" variant="ghost" size="md">
              <ShieldCheck className="size-4" /> Verify
            </Button>
          </Link>
        </div>
      </section>

      {ready && user ? <PerkTiles /> : null}

      <Link
        href="/upgrade"
        className="relative mt-6 block overflow-hidden rounded-3xl bg-linear-to-br from-[#ecd79c] via-gold to-[#8f7331] p-5 text-bg"
      >
        <Crown className="absolute -top-3 -right-3 size-28 rotate-12 opacity-15" />
        <p className="font-display text-sm tracking-[0.2em] uppercase">Kutana Gold</p>
        <p className="mt-1 font-display text-2xl leading-tight">See who likes you</p>
        <p className="mt-1 text-sm opacity-80">Unlimited likes, rewind and Super Likes. From KES 149 a week.</p>
        <span className="mt-4 inline-flex rounded-full bg-bg px-4 py-2 text-sm font-medium text-gold">Get Gold</span>
      </Link>

      <Link href="/invite" className="mt-3 flex items-center gap-4 rounded-3xl border border-line p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/15">
          <Gift className="size-5 text-gold" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Invite friends, get Gold</p>
          <p className="mt-0.5 text-sm text-muted">7 days of Gold for every friend who goes live.</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" />
      </Link>

      <Link href="/campus" className="mt-3 flex items-center gap-4 rounded-3xl border border-line p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/15">
          <GraduationCap className="size-5 text-gold" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Campus</p>
          <p className="mt-0.5 text-sm text-muted">Verify with your university email and help open your campus.</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" />
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
        Kutana is 18+. You can report or block anyone from their profile or your chat.
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

function CompletionRing({ percent }: { percent: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90" aria-hidden>
      <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke="#d4b56a"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)}
      />
    </svg>
  );
}

type Perks = { plan: string | null; superLikes: number; boosts: number };

function PerkTiles() {
  const [perks, setPerks] = useState<Perks | null>(null);
  useEffect(() => {
    void fetch("/api/me/entitlements")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Perks } | null) => setPerks(json?.data ?? null))
      .catch(() => {});
  }, []);
  const tiles = [
    { icon: <Star className="size-5 fill-sky-400 text-sky-400" />, value: perks ? String(perks.superLikes) : "–", label: "Super Likes" },
    { icon: <Zap className="size-5 fill-violet-400 text-violet-400" />, value: perks ? String(perks.boosts) : "–", label: "Boosts" },
    {
      icon: <Heart className="size-5 fill-gold text-gold" />,
      value: perks?.plan === "platinum" ? "Platinum" : perks?.plan === "gold" ? "Gold" : "Free",
      label: "Plan",
    },
  ];
  return (
    <div className="mt-6 grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <Link key={tile.label} href="/upgrade" className="flex flex-col items-center rounded-3xl border border-line py-4">
          {tile.icon}
          <p className="mt-1.5 font-display text-lg leading-none">{tile.value}</p>
          <p className="mt-1 text-[11px] text-muted">{tile.label}</p>
        </Link>
      ))}
    </div>
  );
}
