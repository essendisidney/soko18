"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MoreHorizontal } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { blocksSnapshot, subscribeBlocks, writeBlock } from "@/lib/blocks/local";
import { favoritesSnapshot, subscribeFavorites, writeFavorite } from "@/lib/favorites/local";
import { parseIdList } from "@/lib/safety/local-ids";
import { postBlock, postFavorite, postProfileReport } from "@/lib/safety/client";
import { profileUrl, shareProfile } from "@/lib/profile/share";
import { ReportReasons } from "@/components/safety/report-reasons";
import { AuthGate, type AuthIntent } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import type { SeedProfile } from "@/lib/types";

export function ProfileOverflow({ profile }: { profile: SeedProfile }) {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [gate, setGate] = useState<AuthIntent | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const favoriteRaw = useSyncExternalStore(subscribeFavorites, favoritesSnapshot, () => null);
  const blockRaw = useSyncExternalStore(subscribeBlocks, blocksSnapshot, () => null);
  const saved = parseIdList(favoriteRaw).includes(profile.id);
  const blocked = parseIdList(blockRaw).includes(profile.id);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More"
        className="grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur"
        onClick={() => {
          setOpen((v) => !v);
          setReport(false);
          setNotice(null);
        }}
      >
        <MoreHorizontal className="size-5" />
      </button>

      {open && !report ? (
        <div className="glass absolute top-12 right-0 z-20 w-56 rounded-2xl p-2 text-sm">
          <button
            type="button"
            className="flex w-full px-3 py-2.5 text-left"
            onClick={() => {
              void shareProfile(profile.name, profileUrl(profile.slug)).then((result) => {
                setNotice(result === "copied" ? "Link copied." : result === "failed" ? "Couldn’t share." : null);
                setOpen(false);
              });
            }}
          >
            Share
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2.5 text-left"
            onClick={() => {
              const next = !saved;
              writeFavorite(profile.id, next);
              if (user) void postFavorite(profile.id, next);
              setNotice(next ? "Saved." : "Removed.");
              setOpen(false);
            }}
          >
            {saved ? "Saved" : "Favorite"}
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2.5 text-left text-danger"
            onClick={() => {
              if (!ready) return;
              if (!user) {
                setGate("report");
                return;
              }
              setReport(true);
            }}
          >
            Report
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2.5 text-left"
            onClick={() => {
              const next = !blocked;
              writeBlock(profile.id, next);
              if (next) writeFavorite(profile.id, false);
              if (user) {
                void postBlock(profile.id, next);
                if (next) void postFavorite(profile.id, false);
              }
              setNotice(next ? "Blocked. Hidden from Discover." : "Unblocked.");
              setOpen(false);
            }}
          >
            {blocked ? "Unblock" : "Block"}
          </button>
          <p className="px-3 py-2 text-xs text-muted">
            Public search indexing is {profile.indexPublic ? "on" : "off"} for this profile.
          </p>
        </div>
      ) : null}

      {open && report ? (
        <div className="absolute top-12 right-0 z-20 w-56">
          <ReportReasons
            onPick={(reason) => {
              void postProfileReport(profile.id, reason).then((result) => {
                if (result.status === 401) {
                  setGate("report");
                  return;
                }
                if (!result.ok) return;
                setReport(false);
                setOpen(false);
                setNotice("Report received.");
              });
            }}
            onCancel={() => setReport(false)}
          />
        </div>
      ) : null}

      {notice ? (
        <p className="absolute top-12 right-0 z-20 whitespace-nowrap rounded-full border border-line bg-bg/95 px-3 py-1.5 text-xs text-muted">
          {notice}
        </p>
      ) : null}

      <AnimatePresence>
        {gate ? <AuthGate intent={gate} onClose={() => setGate(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
