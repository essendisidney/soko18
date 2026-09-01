"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "motion/react";
import { AppHeader } from "@/components/nav/app-header";
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
import { engageProfile } from "@/lib/likes/engage";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { parseIdList } from "@/lib/safety/local-ids";
import { nairobiPlaceLine } from "@/lib/nairobi/live";
import { nearAreaSnapshot, subscribeNearArea, nearAreaName } from "@/lib/nairobi/near";
import { intentSnapshot, subscribeIntents } from "@/lib/onboarding";
import type { SeedProfile } from "@/lib/types";

export function DiscoverDeck({
  initial,
}: {
  initial: SeedProfile[];
}) {
  const { user, ready } = useAuth();
  const [feed, setFeed] = useState(initial);
  const [match, setMatch] = useState<SeedProfile | null>(null);
  const [gate, setGate] = useState<AuthIntent | null>(null);
  const near = useSyncExternalStore(subscribeNearArea, nearAreaSnapshot, () => null);
  const intents = useSyncExternalStore(subscribeIntents, intentSnapshot, () => null);
  const subtitle = nairobiPlaceLine(undefined, 3, near ?? undefined);

  useEffect(() => {
    const q = discoverQuery();
    void fetch(`/api/discover?${q.toString()}`)
      .then((res) => res.json())
      .then((json: { data?: { items?: SeedProfile[] } }) => {
        if (json.data?.items) setFeed(json.data.items);
      })
      .catch(() => {});
  }, [near, intents]);

  const raw = useSyncExternalStore(subscribeDiscoverActions, actionsSnapshot, () => null);
  const blockedRaw = useSyncExternalStore(subscribeBlocks, blocksSnapshot, () => null);
  const profiles = useMemo(() => {
    const exclude = new Set(
      (raw ? (JSON.parse(raw) as DiscoverAction[]) : []).map((row) => row.profileId),
    );
    for (const id of parseIdList(blockedRaw)) exclude.add(id);
    return feed.filter((profile) => !exclude.has(profile.id));
  }, [feed, raw, blockedRaw]);
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
    engageProfile(profile, pending.kind, setMatch);
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
      <AppHeader title="Nairobi" subtitle={subtitle} />
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <SwipeDeck
          profiles={profiles}
          canUndo={canUndo}
          browseHref={near ? `/nairobi/${near}` : "/nairobi"}
          browseLabel={near ? `Browse ${nearAreaName(near)}` : "Browse"}
          onUndo={() => {
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
            engageProfile(profile, kind, setMatch);
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
              if (gate === "like" || gate === "spotlight") clearPendingEngage();
              setGate(null);
            }}
            onDiscover={() => setGate(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
