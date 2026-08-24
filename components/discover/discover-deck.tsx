"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "motion/react";
import { AppHeader } from "@/components/nav/app-header";
import { SwipeDeck } from "@/components/discover/swipe-deck";
import { MatchOverlay } from "@/components/discover/match-overlay";
import { AuthGate, type AuthIntent } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import {
  actionsSnapshot,
  subscribeDiscoverActions,
  writeDiscoverAction,
  type DiscoverAction,
} from "@/lib/discovery/actions";
import { writeImpression } from "@/lib/discovery/impressions";
import { postLike } from "@/lib/likes/client";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { parseIdList } from "@/lib/safety/local-ids";
import type { SeedProfile } from "@/lib/types";

export function DiscoverDeck({
  initial,
  subtitle = "Nairobi · people you’ll like",
}: {
  initial: SeedProfile[];
  subtitle?: string;
}) {
  const { user, ready } = useAuth();
  const [match, setMatch] = useState<SeedProfile | null>(null);
  const [gate, setGate] = useState<AuthIntent | null>(null);

  const raw = useSyncExternalStore(subscribeDiscoverActions, actionsSnapshot, () => null);
  const blockedRaw = useSyncExternalStore(subscribeBlocks, blocksSnapshot, () => null);
  const profiles = useMemo(() => {
    const exclude = new Set(
      (raw ? (JSON.parse(raw) as DiscoverAction[]) : []).map((row) => row.profileId),
    );
    for (const id of parseIdList(blockedRaw)) exclude.add(id);
    return initial.filter((profile) => !exclude.has(profile.id));
  }, [initial, raw, blockedRaw]);

  const onImpression = useCallback((profile: SeedProfile) => {
    writeImpression({ profileId: profile.id, surface: "discover", at: Date.now() });
    void fetch("/api/discover/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, surface: "discover" }),
    });
  }, []);

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <AppHeader title="Discover" subtitle={subtitle} />
      <div className="mt-5 min-h-0 flex-1">
        <SwipeDeck
          profiles={profiles}
          onImpression={onImpression}
          onPass={(profile) => {
            writeDiscoverAction({ profileId: profile.id, kind: "pass", at: Date.now() });
            if (user) void postLike(profile.id, "pass");
          }}
          onEngage={(_profile, kind) => {
            if (!ready) return false;
            if (user) return true;
            setGate(kind);
            return false;
          }}
          onLike={(profile, kind) => {
            writeDiscoverAction({ profileId: profile.id, kind, at: Date.now() });
            void postLike(profile.id, kind).then((result) => {
              if (result.ok && result.data.isNew) setMatch(profile);
            });
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
        {gate ? <AuthGate intent={gate} onClose={() => setGate(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
