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
import { Wordmark } from "@/components/brand/wordmark";
import { SlidersHorizontal, Zap, LayoutGrid } from "lucide-react";
import { readIncognito } from "@/lib/privacy/local";
import type { SeedProfile } from "@/lib/types";
import { cityHomeHref } from "@/lib/geo/kenya";
import { LaunchMeter } from "@/components/growth/launch-meter";

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
  const [ghost, setGhost] = useState(false);
  const [clock, setClock] = useState(0);
  const near = useSyncExternalStore(subscribeNearArea, nearAreaSnapshot, () => null);
  const citySlug = useSyncExternalStore(
    subscribeNearArea,
    () => localStorage.getItem(ONBOARDING.city),
    () => "nairobi",
  );
  const intents = useSyncExternalStore(subscribeIntents, intentSnapshot, () => null);
  const place = cityPlaceLine(citySlug || "nairobi", near);
  const tonight = clock >= 0 ? tonightAreaNames(readImpressions(), feed) : [];
  const areas = tonight.length > 0 ? tonight.join(" · ") : place;
  const subtitle = areas;

  useEffect(() => {
    setGhost(readIncognito());
    writeCity(localStorage.getItem(ONBOARDING.city) || "nairobi");
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClock((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const q = discoverQuery();
    if (q.get("city") && q.get("city") !== "nairobi") setFeed([]);
    void fetch(`/api/discover?${q.toString()}`)
      .then((res) => res.json())
      .then((json: { data?: { items?: SeedProfile[] } }) => {
        if (json.data?.items) setFeed(json.data.items);
      })
      .catch(() => {});
  }, [near, intents, citySlug, filtersVersion]);

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
    engageProfile(profile, pending.kind, setMatch, setUpsell);
  }, [ready, user, feed, initial, blockedRaw]);

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
      <header className="flex items-center justify-between gap-2 px-1 pt-1">
        <h1 className="sr-only">{cityNameBySlug(citySlug || "nairobi")}</h1>
        <Wordmark size="sm" />
        <div className="flex items-center gap-1.5">
          <span className="max-w-[9rem] truncate rounded-full border border-line px-3 py-1.5 text-xs text-muted" title={subtitle}>
            {near ? nearAreaName(near) : cityNameBySlug(citySlug || "nairobi")}
          </span>
          <button
            type="button"
            aria-label={t("discover.filters")}
            onClick={() => setFilters((open) => !open)}
            className="grid size-9 place-items-center rounded-full border border-line text-muted"
          >
            <SlidersHorizontal className="size-4" />
          </button>
          <Link
            href={cityHomeHref(citySlug || "nairobi")}
            aria-label={t("tab.browse")}
            className="grid size-9 place-items-center rounded-full border border-line text-muted"
          >
            <LayoutGrid className="size-4" />
          </Link>
          <Link
            href="/upgrade"
            aria-label={t("discover.boostGold")}
            className="grid size-9 place-items-center rounded-full border border-gold/60 text-gold"
          >
            <Zap className="size-4" />
          </Link>
        </div>
      </header>
      {ghost ? <p className="mt-2 px-1 text-xs text-gold">You’re invisible</p> : null}
      {filters ? (
        <FiltersSheet
          onClose={() => {
            setFilters(false);
            setFiltersVersion((n) => n + 1);
          }}
        />
      ) : null}
      {upsell ? (
        <div className="glass mt-3 rounded-2xl p-4 text-sm">
          <p>{upsell.message}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/upgrade" className="text-gold">
              {upsell.code === "no_super_likes" ? t("discover.getSuper") : t("discover.getGold")}
            </Link>
            <button type="button" className="text-muted" onClick={() => setUpsell(null)}>
              {t("discover.notNow")}
            </button>
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex min-h-0 flex-1 flex-col">
        <SwipeDeck
          profiles={profiles}
          canUndo={canUndo}
          browseHref={areaBrowseHref(citySlug || "nairobi", near)}
          browseLabel={`Browse ${near ? nearAreaName(near) : cityNameBySlug(citySlug || "nairobi")}`}
          emptyTitle={
            catalogForCity(citySlug || "nairobi").length === 0
              ? `No one in ${near ? nearAreaName(near) : cityNameBySlug(citySlug || "nairobi")} yet`
              : near
                ? `That’s everyone in ${nearAreaName(near)}`
                : "That’s everyone around you"
          }
          emptyHint={
            catalogForCity(citySlug || "nairobi").length === 0
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
          onEngage={(profile, kind) => {
            if (!ready) return false;
            if (user) return true;
            writePendingEngage({ profileId: profile.id, kind, at: Date.now() });
            setGate(kind);
            return false;
          }}
          onLike={(profile, kind) => {
            engageProfile(profile, kind, setMatch, setUpsell);
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
