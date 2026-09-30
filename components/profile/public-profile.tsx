"use client";

import { INTENTS } from "@/lib/data/nairobi";
import { SendIntro } from "@/components/profile/send-intro";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { publicPhotos } from "@/lib/media/public";
import { similarProfiles } from "@/lib/data/seed";
import type { SeedProfile } from "@/lib/types";
import { Button } from "@/components/soko/button";
import { PresenceDot } from "@/components/soko/presence-dot";
import { ProfileCard } from "@/components/soko/profile-card";
import { VerificationBadge } from "@/components/soko/verification-badge";
import { AuthGate, type AuthIntent } from "@/components/auth/auth-gate";
import { Wordmark } from "@/components/brand/wordmark";
import { ImpressionBeacon } from "@/components/analytics/impression-beacon";
import { MatchOverlay } from "@/components/discover/match-overlay";
import { TabBar } from "@/components/nav/tab-bar";
import { ProfileBack, goBackOr } from "@/components/profile/profile-back";
import { ProfileOverflow } from "@/components/profile/profile-overflow";
import { PhotoViewer } from "@/components/profile/photo-viewer";
import { useAuth } from "@/lib/auth/use-auth";
import { clearPendingEngage, readPendingEngage, writePendingEngage } from "@/lib/auth/pending-engage";
import { engageProfile } from "@/lib/likes/engage";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { hideBlocked } from "@/lib/safety/flags";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { useHiddenByReports } from "@/lib/reports/use-hidden";
import { cn } from "@/lib/utils";
import { sokoVerified } from "@/lib/trust/verified";

export function PublicProfile({
  profile,
  matched = false,
}: {
  profile: SeedProfile;
  matched?: boolean;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [photo, setPhoto] = useState<number | null>(null);
  const [gate, setGate] = useState<AuthIntent | null>(null);
  const [match, setMatch] = useState(false);
  const [needMatch, setNeedMatch] = useState(false);
  const blockedIds = useLocalIds(subscribeBlocks, blocksSnapshot);
  const reported = useHiddenByReports();
  const blocked = blockedIds.includes(profile.id);
  const more = hideBlocked(similarProfiles(profile), [...blockedIds, ...reported]);
  const v = profile.verification;
  const photos = publicPhotos(profile);

  useEffect(() => {
    if (!ready || !user || blocked) return;
    const pending = readPendingEngage();
    if (!pending || pending.profileId !== profile.id) return;
    clearPendingEngage();
    engageProfile(profile, pending.kind, () => setMatch(true));
  }, [ready, user, blocked, profile]);

  if (!photos[0]) {
    return (
      <main className="min-h-dvh bg-bg pb-24">
        <p className="grid min-h-[70dvh] place-items-center text-muted">This profile isn’t available.</p>
        <TabBar />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg pb-44">
      <ImpressionBeacon profileId={profile.id} surface="profile" />
      <div className="relative aspect-[3/4]">
        <button
          type="button"
          aria-label="View photos"
          className="absolute inset-0"
          onClick={() => setPhoto(0)}
        >
          <Image
            src={photos[0]}
            alt={`${profile.name}, ${profile.age}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized={photos[0].startsWith("http")}
          />
        </button>
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-bg via-transparent to-black/30" />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
          <ProfileBack />
          <ProfileOverflow profile={profile} />
        </div>
      </div>

      <div className="-mt-16 relative px-5">
        {sokoVerified(profile) ? <VerificationBadge label="SOKO18 Verified" /> : null}
        <h1 className="mt-3 font-display text-4xl tracking-tight">{profile.name}</h1>
        <p className="mt-1 text-cream/80">
          {profile.age} · {profile.city} · {profile.area}
        </p>
        <PresenceDot presence={profile.presence} className="mt-2" />
        {blocked ? <p className="mt-3 text-sm text-muted">You blocked them. They won’t appear in Discover or Browse.</p> : null}

        {blocked ? (
          <Link href="/discover" className="mt-6 block">
            <Button variant="gold" className="w-full">
              Discover
            </Button>
          </Link>
        ) : null}
        {!matched && user ? <SendIntro profileId={profile.id} name={profile.name} /> : null}

        {profile.bio ? (
          <section className="mt-8 rounded-3xl border border-line p-5">
            <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">About me</h2>
            <p className="mt-2 text-[17px] leading-relaxed text-cream/90">{profile.bio}</p>
          </section>
        ) : null}

        {profile.lookingFor ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 text-sm text-gold">
              {INTENTS.find((intent) => intent.id === profile.lookingFor)?.label}
            </span>
            <span className="rounded-full border border-line px-3 py-1.5 text-sm text-cream/80">{profile.area}</span>
          </div>
        ) : null}

        {Array.from({ length: Math.max((profile.prompts ?? []).length, photos.length - 1) }).map((_, i) => {
          const prompt = profile.prompts?.[i];
          const src = photos[i + 1];
          return (
            <div key={i}>
              {prompt ? (
                <section className="mt-4 rounded-3xl bg-bg-elevated p-6">
                  <h2 className="text-sm text-cream/70">{prompt.q}</h2>
                  <p className="mt-2 font-display text-[26px] leading-snug">{prompt.a}</p>
                </section>
              ) : null}
              {src ? (
                <button
                  type="button"
                  onClick={() => setPhoto(i + 1)}
                  className="relative mt-4 block aspect-[4/5] w-full overflow-hidden rounded-3xl"
                  aria-label={`Photo ${i + 2}`}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 448px) 100vw, 448px" unoptimized={src.startsWith("http")} />
                </button>
              ) : null}
            </div>
          );
        })}

        <section className="mt-10">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Trust</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className={cn(v.identity || v.profile ? "text-cream" : "text-muted")}>
              {v.identity || v.profile ? "✓ Photo verified — they matched a live selfie" : "○ Photos not verified yet"}
            </li>
            <li className={cn(v.phone ? "text-cream" : "text-muted")}>{v.phone ? "✓" : "○"} Phone confirmed</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Similar</h2>
          {more.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {more.map((p) => (
                <ProfileCard key={p.id} profile={p} compact href={`/profile/${p.slug}`} />
              ))}
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted">No one similar nearby.</p>
              {blocked ? null : (
                <Link href="/discover" className="mt-4 inline-block">
                  <Button variant="gold" size="sm">
                    Discover
                  </Button>
                </Link>
              )}
            </>
          )}
        </section>
      </div>

      {!blocked ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-48 bg-linear-to-t from-bg via-bg/85 to-transparent" aria-hidden />
      ) : null}
      {!blocked ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[5.5rem] z-30 mx-auto flex max-w-md items-center justify-center gap-5 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            type="button"
            aria-label="Pass"
            onClick={() => goBackOr(router, "/discover")}
            className="pointer-events-auto grid size-14 place-items-center rounded-full border border-line bg-bg-elevated shadow-[0_8px_30px_rgba(0,0,0,0.6)] active:scale-90"
          >
            <X className="size-7 text-rose-400" strokeWidth={2.6} />
          </button>
          <button
            type="button"
            aria-label="Super Like"
            onClick={() => {
              if (!ready || !user) {
                writePendingEngage({ profileId: profile.id, kind: "super", at: Date.now() });
                setGate("super");
                return;
              }
              engageProfile(profile, "super", () => setMatch(true));
            }}
            className="pointer-events-auto grid size-11 place-items-center rounded-full border border-line bg-bg-elevated shadow-[0_8px_30px_rgba(0,0,0,0.6)] active:scale-90"
          >
            <Star className="size-5 fill-sky-400 text-sky-400" />
          </button>
          {matched ? (
            <button
              type="button"
              aria-label="Message"
              onClick={() => router.push(`/messages/${profile.slug}`)}
              className="pointer-events-auto grid size-14 place-items-center rounded-full bg-gold shadow-[0_10px_36px_rgba(212,181,106,0.35)] active:scale-90"
            >
              <MessageCircle className="size-7 fill-bg text-bg" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Like"
              onClick={() => {
                if (!ready || !user) {
                  writePendingEngage({ profileId: profile.id, kind: "like", at: Date.now() });
                  setGate("like");
                  return;
                }
                engageProfile(profile, "like", () => setMatch(true));
              }}
              className="pointer-events-auto grid size-14 place-items-center rounded-full bg-gold shadow-[0_10px_36px_rgba(212,181,106,0.35)] active:scale-90"
            >
              <Heart className="size-7 fill-bg text-bg" />
            </button>
          )}
        </div>
      ) : null}
      {photo !== null ? (
        <PhotoViewer
          photos={photos}
          index={photo}
          alt={`${profile.name}, ${profile.age}`}
          onIndex={setPhoto}
          onClose={() => setPhoto(null)}
        />
      ) : null}
      <AnimatePresence>
        {match ? (
          <MatchOverlay
            profile={profile}
            onClose={() => setMatch(false)}
            onMessage={() => {
              if (!ready || !user) {
                setMatch(false);
                setGate("message");
                return false;
              }
              return true;
            }}
          />
        ) : null}
        {gate ? (
          <AuthGate
            intent={gate}
            onClose={() => {
              if (gate === "like" || gate === "super") clearPendingEngage();
              setGate(null);
            }}
            onDiscover={() => setGate(null)}
          />
        ) : null}
        {needMatch ? (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 px-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Wordmark size="sm" />
            <h2 className="mt-10 font-display text-4xl tracking-tight">No thread yet</h2>
            <p className="mt-4 max-w-xs text-sm text-muted">A like stays quiet until they like you back.</p>
            <Link href="/discover" className="mt-10 w-full max-w-xs">
              <Button className="w-full" variant="gold">
                Discover
              </Button>
            </Link>
            <button type="button" onClick={() => setNeedMatch(false)} className="mt-5 text-sm text-muted">
              Not now
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <TabBar />
    </main>
  );
}
