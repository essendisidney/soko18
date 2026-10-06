"use client";

import { useT } from "@/lib/i18n/use-t";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "motion/react";
import { SwipeDeck } from "@/components/discover/swipe-deck";
import { MatchOverlay } from "@/components/discover/match-overlay";
import { AuthGate, type AuthIntent } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import {
  actionsSnapshot,
  subscribeDiscoverActions,
  undoLastPass,
  writeDiscoverAction,
  type DiscoverAction,
} from "@/lib/discovery/actions";
import { writeImpression } from "@/lib/discovery/impressions";
import { discoverQuery } from "@/lib/discovery/prefs";
import { clearPendingEngage, readPendingEngage, writePendingEngage } from "@/lib/auth/pending-engage";
import { postLike } from "@/lib/likes/client";
import { engageProfile, type LikeUpsell } from "@/lib/likes/engage";
import Link from "next/link";
import { FiltersSheet } from "@/components/discover/filters-sheet";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { parseIdList } from "@/lib/safety/local-ids";
import { useHiddenByReports } from "@/lib/reports/use-hidden";
import { cityPlaceLine } from "@/lib/nairobi/live";
import { tonightAreaNames } from "@/lib/nairobi/tonight";
import { readImpressions } from "@/lib/discovery/impressions";
import { nearAreaSnapshot, subscribeNearArea, nearAreaName, writeCity } from "@/lib/nairobi/near";
import { cityNameBySlug, areaBrowseHref } from "@/lib/geo/kenya";
import { catalogForCity } from "@/lib/discovery/feed";
import { ONBOARDING } from "@/lib/onboarding";
import { intentSnapshot, subscribeIntents } from "@/lib/onboarding";
import { KutanaMark } from "@/lib/brand/kutana-mark";
import { ChevronDown, Crown, LayoutGrid, SlidersHorizontal, Sparkles } from "lucide-react";
import { PlaceSheet } from "@/components/discover/place-sheet";
import { ProfileNudge } from "@/components/discover/profile-nudge";
import { readIncognito } from "@/lib/privacy/local";
import type { SeedProfile } from "@/lib/types";
import { cityHomeHref } from "@/lib/geo/kenya";
import { LaunchMeter } from "@/components/growth/launch-meter";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { useProfileMeta } from "@/lib/profile/sync";
import { canEngage, missingToGoLive } from "@/lib/profile/ready";
import { Button } from "@/components/soko/button";
import { Chip } from "@/components/soko/chip";
import { useMounted } from "@/lib/use-mounted";
import { readCampusDeck, subscribeCampusDeck, writeCampusDeck } from "@/lib/campus/deck";
import { campusDeckOpen, type MyCampus } from "@/lib/campus/shared";
import { GraduationCap } from "lucide-react";

export function DiscoverDeck({
  initial,
}: {
  initial: SeedProfile[];
}) {
  const { user, ready } = useAuth();
  const [feed, setFeed] = useState(initial);
  const [match, setMatch] = useState<SeedProfile | null>(null);
  const [upsell, setUpsell] = useState<LikeUpsell | { code: "gold_required"; message: string } | null>(null);
  const [filters, setFilters] = useState(false);
  const t = useT();
  const [filtersVersion, setFiltersVersion] = useState(0);
  const [plan, setPlan] = useState<string | null | undefined>(undefined);
  const [gate, setGate] = useState<AuthIntent | null>(null);
  const [clock, setClock] = useState(0);
  const near = useSyncExternalStore(subscribeNearArea, nearAreaSnapshot, () => null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const myProfile = useDraftProfile();
  const myMeta = useProfileMeta();
  const [needProfile, setNeedProfile] = useState(false);
  const [restore, setRestore] = useState<{ id: string; n: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const onLikeFailed = useCallback((profile: SeedProfile, message: string | null) => {
    setRestore((r) => ({ id: profile.id, n: (r?.n ?? 0) + 1 }));
    if (message) setToast(message);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);
  const citySlug = useSyncExternalStore(
    subscribeNearArea,
    () => localStorage.getItem(ONBOARDING.city),
    () => "nairobi",
  );
  const intents = useSyncExternalStore(subscribeIntents, intentSnapshot, () => null);
  const campusDeck = useSyncExternalStore(subscribeCampusDeck, readCampusDeck, () => null);
  const ghost = useMounted() && readIncognito();
  // Switching to a campus or another city empties the deck until its people load — never a borrowed deck.
  const deckKey = `${campusDeck ?? ""}|${citySlug ?? ""}`;
  const [shownDeck, setShownDeck] = useState(deckKey);
  if (shownDeck !== deckKey) {
    setShownDeck(deckKey);
    if (campusDeck || (citySlug && citySlug !== "nairobi")) setFeed([]);
  }
  const [campusFetched, setMyCampus] = useState<MyCampus | null | undefined>(undefined);
  const place = cityPlaceLine(citySlug || "nairobi", near);
  const tonight = clock >= 0 ? tonightAreaNames(readImpressions(), feed) : [];
  const areas = tonight.length > 0 ? tonight.join(" · ") : place;
  const subtitle = areas;

  useEffect(() => {
    writeCity(localStorage.getItem(ONBOARDING.city) || "nairobi");
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClock((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // A "campus is open" notification links to /discover?campus=<slug>.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("campus");
    if (asked) writeCampusDeck(asked);
  }, []);

  const signedIn = ready && Boolean(user) && isSupabaseConfigured();
  useEffect(() => {
    if (!signedIn) return;
    void fetch("/api/campus")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { mine: MyCampus | null } } | null) => setMyCampus(json?.data?.mine ?? null))
      .catch(() => setMyCampus(null));
  }, [signedIn]);

  // The campus deck is only for verified students of an open campus.
  const myCampus = !ready ? undefined : signedIn ? campusFetched : null;
  const campusOpen = campusDeckOpen(myCampus) ? myCampus : null;
  useEffect(() => {
    if (myCampus === undefined || !campusDeck) return;
    if (!campusOpen || campusOpen.slug !== campusDeck) writeCampusDeck(null);
  }, [myCampus, campusOpen, campusDeck]);

  useEffect(() => {
    const q = discoverQuery();
    void fetch(`/api/discover?${q.toString()}`)
      .then((res) => res.json())
      .then((json: { data?: { items?: SeedProfile[] } }) => {
        if (json.data?.items) setFeed(json.data.items);
      })
      .catch(() => {});
  }, [near, intents, citySlug, filtersVersion, campusDeck]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    void fetch("/api/me/entitlements")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { plan: string | null } } | null) => setPlan(json?.data?.plan ?? null))
      .catch(() => setPlan(null));
  }, [user]);

  const raw = useSyncExternalStore(subscribeDiscoverActions, actionsSnapshot, () => null);
  const blockedRaw = useSyncExternalStore(subscribeBlocks, blocksSnapshot, () => null);
  const reported = useHiddenByReports(user?.id ?? "local");
  const profiles = useMemo(() => {
    const exclude = new Set(
      (raw ? (JSON.parse(raw) as DiscoverAction[]) : []).map((row) => row.profileId),
    );
    for (const id of parseIdList(blockedRaw)) exclude.add(id);
    for (const id of reported) exclude.add(id);
    return feed.filter((profile) => !exclude.has(profile.id));
  }, [feed, raw, blockedRaw, reported]);
  const canUndo = useMemo(() => {
    if (!raw) return false;
    try {
      return (JSON.parse(raw) as DiscoverAction[]).some((row) => row.kind === "pass");
    } catch {
      return false;
    }
  }, [raw]);

  const resumed = useRef(false);

  useEffect(() => {
    if (!ready || !user || resumed.current) return;
    const pending = readPendingEngage();
    if (!pending) return;
    if (parseIdList(blockedRaw).includes(pending.profileId)) {
      clearPendingEngage();
      return;
    }
    const profile =
      feed.find((row) => row.id === pending.profileId) ??
      initial.find((row) => row.id === pending.profileId);
    if (!profile) return;
    clearPendingEngage();
    resumed.current = true;
    engageProfile(profile, pending.kind, setMatch, setUpsell, onLikeFailed);
  }, [ready, user, feed, initial, blockedRaw, onLikeFailed]);

  const onImpression = useCallback((profile: SeedProfile) => {
    writeImpression({ profileId: profile.id, surface: "discover", at: Date.now() });
    void fetch("/api/discover/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, surface: "discover" }),
    });
  }, []);

  return (
    <div className="flex h-[calc(100dvh-6.75rem-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-1 pt-1">
        <h1 className="sr-only">{cityNameBySlug(citySlug || "nairobi")}</h1>
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href="/" aria-label="Kutana" className="shrink-0">
            <KutanaMark size={30} />
          </Link>
          <button
            type="button"
            onClick={() => setPlaceOpen(true)}
            className="min-w-0 text-left"
            title={subtitle}
            aria-label="Change area"
          >
            <span className="block text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
              {campusDeck && campusOpen ? "Campus" : "Discover in"}
            </span>
            <span className="flex items-center gap-1 font-display text-lg leading-tight font-bold text-cream">
              <span className="truncate">
                {campusDeck && campusOpen ? campusOpen.shortName : near ? nearAreaName(near) : cityNameBySlug(citySlug || "nairobi")}
              </span>
              <ChevronDown className="size-4 shrink-0 text-gold" />
            </span>
          </button>
        </div>
        <div className="flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            aria-label={t("discover.filters")}
            onClick={() => setFilters((open) => !open)}
            className="grid size-9 place-items-center rounded-full text-cream/80 transition-colors active:bg-white/10"
          >
            <SlidersHorizontal className="size-[18px]" />
          </button>
          <span className="h-5 w-px bg-white/10" aria-hidden />
          <Link
            href={cityHomeHref(citySlug || "nairobi")}
            aria-label={t("tab.browse")}
            className="grid size-9 place-items-center rounded-full text-cream/80 transition-colors active:bg-white/10"
          >
            <LayoutGrid className="size-[18px]" />
          </Link>
        </div>
      </header>
      {campusOpen ? (
        <div className="mt-2 flex gap-2 px-1" role="group" aria-label="Deck">
          <Chip className="px-3 py-1.5 text-xs" selected={!campusDeck} onClick={() => writeCampusDeck(null)}>
            Near you
          </Chip>
          <Chip
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            selected={campusDeck === campusOpen.slug}
            onClick={() => writeCampusDeck(campusOpen.slug)}
          >
            <GraduationCap className="size-3.5 text-gold" />
            {campusOpen.shortName} only
          </Chip>
        </div>
      ) : myCampus && myCampus.status === "waitlist" ? (
        <Link href="/campus" className="mt-2 inline-flex items-center gap-1.5 px-1 text-xs text-gold">
          <GraduationCap className="size-3.5" />
          {myCampus.shortName}: {myCampus.joined} of {myCampus.target} students in — help open it
        </Link>
      ) : null}
      <ProfileNudge />
      {ghost ? <p className="mt-2 px-1 text-xs text-gold">You’re invisible</p> : null}
      <AnimatePresence>
        {placeOpen ? <PlaceSheet citySlug={citySlug || "nairobi"} near={near} onClose={() => setPlaceOpen(false)} /> : null}
      </AnimatePresence>
      {filters ? (
        <FiltersSheet
          onClose={() => {
            setFilters(false);
            setFiltersVersion((n) => n + 1);
          }}
        />
      ) : null}
      {upsell ? (
        <Sheet onClose={() => setUpsell(null)}>
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold/15">
            <Crown className="size-6 text-gold" />
          </span>
          <p className="mt-3 font-display text-2xl">
            {upsell.code === "like_limit" ? "You’re out of likes for today" : upsell.code === "no_super_likes" ? "No Super Likes left" : "That’s a Gold feature"}
          </p>
          <p className="mt-1 text-sm text-muted">{upsell.message}</p>
          <Link href="/upgrade" className="mt-5 block">
            <Button variant="gold" className="w-full">
              {upsell.code === "no_super_likes" ? t("discover.getSuper") : t("discover.getGold")}
            </Button>
          </Link>
          <button type="button" className="mt-3 text-sm text-muted" onClick={() => setUpsell(null)}>
            {t("discover.notNow")}
          </button>
        </Sheet>
      ) : null}
      {needProfile ? (
        <Sheet onClose={() => setNeedProfile(false)}>
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold/15">
            <Sparkles className="size-6 text-gold" />
          </span>
          <p className="mt-3 font-display text-2xl">First, let them see you</p>
          <p className="mt-1 text-sm text-muted">
            {(() => {
              const missing = missingToGoLive(myProfile, myMeta?.photos ?? 0);
              return missing.length
                ? `Add ${missing.join(", ")} and you’re live. It takes about a minute.`
                : "Open your profile and tap Go live.";
            })()}
          </p>
          <Link href="/studio/profile" className="mt-5 block">
            <Button variant="gold" className="w-full">
              {myProfile ? "Finish my profile" : "Make my profile"}
            </Button>
          </Link>
          <button type="button" className="mt-3 text-sm text-muted" onClick={() => setNeedProfile(false)}>
            Keep looking
          </button>
        </Sheet>
      ) : null}
      {toast ? (
        <p role="status" className="fixed inset-x-6 bottom-28 z-40 mx-auto max-w-sm rounded-full bg-bg-elevated px-4 py-2.5 text-center text-sm shadow-lg">
          {toast}
        </p>
      ) : null}
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <SwipeDeck
          profiles={profiles}
          canUndo={canUndo}
          browseHref={areaBrowseHref(citySlug || "nairobi", near)}
          browseLabel={`Browse ${near ? nearAreaName(near) : cityNameBySlug(citySlug || "nairobi")}`}
          emptyTitle={
            campusDeck && campusOpen
              ? `That’s everyone at ${campusOpen.shortName} for now`
              : catalogForCity(citySlug || "nairobi").length === 0
              ? `No one in ${near ? nearAreaName(near) : cityNameBySlug(citySlug || "nairobi")} yet`
              : near
                ? `That’s everyone in ${nearAreaName(near)}`
                : "That’s everyone around you"
          }
          emptyHint={
            campusDeck && campusOpen
              ? "New students verify every day. Invite your friends to fill the deck."
              : catalogForCity(citySlug || "nairobi").length === 0
              ? "You’re early. Every profile here is a real, checked person — bring your friends and get it going."
              : "People you pass stay hidden for 30 days. New people join every day."
          }
          emptyExtra={
            <LaunchMeter
              city={citySlug || "nairobi"}
              area={near}
              place={near ? nearAreaName(near) : cityNameBySlug(citySlug || "nairobi")}
            />
          }
          notifyCity={catalogForCity(citySlug || "nairobi").length === 0 ? citySlug || null : null}
          onUndo={() => {
            // Rewind is Gold for signed-in members; guests keep the local undo.
            if (user && isSupabaseConfigured() && !plan) {
              setUpsell({ code: "gold_required", message: "Rewind your last pass with Gold." });
              return null;
            }
            if (user && isSupabaseConfigured()) void fetch("/api/likes/rewind", { method: "POST" });
            const id = undoLastPass();
            if (!id) return null;
            setFeed((current) => {
              if (current.some((profile) => profile.id === id)) return current;
              const restored = initial.find((profile) => profile.id === id);
              return restored ? [restored, ...current] : current;
            });
            return id;
          }}
          onImpression={onImpression}
          onPass={(profile) => {
            writeDiscoverAction({ profileId: profile.id, kind: "pass", at: Date.now() });
            if (user) void postLike(profile.id, "pass");
          }}
          restore={restore}
          onEngage={(profile, kind) => {
            if (!ready) return false;
            if (user && isSupabaseConfigured() && !canEngage(myProfile)) {
              setNeedProfile(true);
              return false;
            }
            if (user) return true;
            writePendingEngage({ profileId: profile.id, kind, at: Date.now() });
            setGate(kind);
            return false;
          }}
          onLike={(profile, kind) => {
            engageProfile(profile, kind, setMatch, setUpsell, onLikeFailed);
          }}
        />
      </div>
      <AnimatePresence>
        {match ? (
          <MatchOverlay
            profile={match}
            onClose={() => setMatch(null)}
            onMessage={() => {
              if (!ready || !user) {
                setMatch(null);
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
      </AnimatePresence>
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[28px] border border-line bg-bg-elevated p-6 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
