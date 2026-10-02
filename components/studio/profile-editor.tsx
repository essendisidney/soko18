"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { areasForCity, cityNameBySlug, placeShareName } from "@/lib/geo/kenya";
import { citySnapshot, readNearArea, subscribeNearArea, writeNearArea } from "@/lib/nairobi/near";
import { Button } from "@/components/soko/button";
import { Chip } from "@/components/soko/chip";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { saveProfileAction } from "@/lib/profile/actions";
import { draftHealth } from "@/lib/profile/health";
import { writeLocalDraft } from "@/lib/profile/local";
import type { OwnerProfileStatus, ProfileDraft } from "@/lib/profile/types";
import { INTENTS } from "@/lib/data/nairobi";
import { intentSnapshot, subscribeIntents } from "@/lib/onboarding";
import { MAX_PROMPT_ANSWER, MAX_PROMPTS, PROMPT_QUESTIONS } from "@/lib/profile/prompts";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { refreshMyProfile, useProfileMeta } from "@/lib/profile/sync";
import { missingToGoLive } from "@/lib/profile/ready";
import { PhotoUploader } from "@/components/studio/photo-uploader";

type Fields = {
  displayName: string;
  birthYear: string;
  areaSlug: string;
  bio: string;
  gender: ProfileDraft["gender"];
  lookingFor: ProfileDraft["lookingFor"];
  prompts: { q: string; a: string }[];
  indexPublic: boolean;
};

const GENDERS = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "nonbinary", label: "Non-binary" },
] as const;

function StatusLine({
  status,
  ready,
  missing,
  city,
}: {
  status: ProfileDraft["status"];
  ready: boolean;
  missing: string[];
  city: string;
}) {
  const line =
    status === "live"
      ? `You’re live in ${city}. Changes show straight away.`
      : status === "pending_review"
        ? "We’re taking a quick look at your profile. You’ll get a notification."
        : status === "paused"
          ? "Paused — you’re hidden. Save to show your profile again."
          : status === "suspended"
            ? "Your profile was taken down. Reply to our notification if you think this is a mistake."
            : ready
              ? "All set. Tap Go live."
              : `Add ${missing.join(", ")} to go live.`;
  return (
    <p className={`mt-2 text-sm ${status === "live" ? "text-gold" : "text-muted"}`}>
      {status === "live" ? <span className="mr-1.5 inline-block size-2 rounded-full bg-emerald-400 align-middle" /> : null}
      {line}
    </p>
  );
}

export function ProfileEditor() {
  const { user, ready: authReady, configured } = useAuth();
  const stored = useDraftProfile();
  const snappedCity = useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");
  const citySlug = stored?.citySlug || snappedCity || "nairobi";
  const areas = areasForCity(citySlug);
  const [fields, setFields] = useState<Fields | null>(null);
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const displayName = fields?.displayName ?? stored?.displayName ?? "";
  const birthYear = fields?.birthYear ?? (stored?.birthYear ? String(stored.birthYear) : "");
  const rawArea = fields?.areaSlug ?? stored?.areaSlug ?? "";
  const areaSlug = areas.some((area) => area.slug === rawArea) ? rawArea : "";
  const bio = fields?.bio ?? stored?.bio ?? "";
  const gender = fields?.gender ?? stored?.gender ?? null;
  // What they picked during onboarding pre-fills "Looking for", so nobody answers it twice.
  const onboardingIntent = useSyncExternalStore(subscribeIntents, intentSnapshot, () => null);
  const firstIntent = INTENTS.find((i) => i.id === (onboardingIntent ?? "").split(",").filter(Boolean)[0])?.id ?? null;
  const lookingFor = fields?.lookingFor ?? stored?.lookingFor ?? firstIntent;
  const prompts = fields?.prompts ?? stored?.prompts ?? [];
  const indexPublic = fields?.indexPublic ?? stored?.indexPublic ?? false;
  const status = stored?.status ?? "draft";
  const meta = useProfileMeta();
  const photoCount = meta?.photos ?? 0;
  const [justLive, setJustLive] = useState(false);

  function patch(next: Partial<Fields>) {
    setFields({
      displayName,
      birthYear,
      areaSlug,
      bio,
      gender,
      lookingFor,
      prompts,
      indexPublic,
      ...next,
    });
  }

  const health = draftHealth({
    displayName,
    birthYear: birthYear ? Number(birthYear) : null,
    areaSlug,
    bio,
    gender,
    lookingFor,
  });
  // What it takes to go live (matches the database rule). Bio and prompts are extras.
  const missing = missingToGoLive({ displayName, areaSlug, gender, lookingFor }, photoCount);
  const ready = missing.length === 0;
  const progress = Math.round(((5 - missing.length) / 5) * 100);
  const extras = [!bio.trim() ? "a line about you" : null, prompts.length === 0 ? "a prompt" : null, photoCount < 3 ? "more photos" : null].filter(
    (x): x is string => Boolean(x),
  );
  void health;

  /**
   * Photos need a saved profile. Create a draft quietly, filling the name from the
   * account (e.g. Google) and the area from where they are, so photos can come first.
   */
  async function ensureProfile() {
    if (stored?.id) return true;
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const fromAccount = String(meta.display_name ?? meta.given_name ?? meta.full_name ?? meta.name ?? "")
      .trim()
      .split(/\s+/)[0];
    const name = displayName.trim() || fromAccount || (user?.email ?? "").split("@")[0].replace(/[^a-zA-Z]/g, "").slice(0, 20) || "Me";
    const near = readNearArea();
    const area = areaSlug || (areas.some((a) => a.slug === near) ? near : areas[0]?.slug) || "";
    if (!area) {
      setNote("Pick your area below, then add photos.");
      return false;
    }
    if (name !== displayName || area !== areaSlug) patch({ displayName: name, areaSlug: area });
    return persist("draft", { displayName: name, areaSlug: area });
  }

  async function persist(
    nextStatus: OwnerProfileStatus,
    overrides: Partial<{ displayName: string; areaSlug: string }> = {},
  ): Promise<boolean> {
    if (configured && authReady && !user) {
      setGate(true);
      return false;
    }
    setBusy(true);
    setNote("");
    const result = await saveProfileAction({
      id: stored?.id,
      displayName: overrides.displayName ?? displayName,
      birthYear: birthYear ? Number(birthYear) : null,
      citySlug,
      areaSlug: overrides.areaSlug ?? areaSlug,
      bio,
      gender,
      lookingFor,
      prompts,
      indexPublic,
      status: nextStatus,
    });
    setBusy(false);
    if (!result.ok) {
      setNote(result.error.message);
      return false;
    }
    const wasLive = status === "live";
    writeLocalDraft(result.data);
    void refreshMyProfile();
    if (result.data.status === "live" && !wasLive) {
      setJustLive(true);
      setNote("");
    } else {
      setNote(
        result.data.status === "live"
          ? "Saved. Your changes are live."
          : result.data.status === "pending_review"
            ? "Saved. We’re taking a quick look and will let you know."
            : missing.length
              ? `Saved. Add ${missing.join(", ")} to go live.`
              : "Saved.",
      );
    }
    return true;
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight">Your profile</h1>
      {justLive ? (
        <div className="mt-4 rounded-3xl border border-gold/60 bg-gold/10 p-5 text-center">
          <p className="font-display text-2xl">You’re live 🎉</p>
          <p className="mt-1 text-sm text-muted">People near you can see you now.</p>
          <Link href="/discover" className="mt-4 block">
            <Button variant="gold" className="w-full">
              Start discovering
            </Button>
          </Link>
        </div>
      ) : (
        <StatusLine status={status} ready={ready} missing={missing} city={cityNameBySlug(citySlug)} />
      )}

      {status !== "live" ? (
        <div className="mt-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-muted">{progress}%</span>
        </div>
      ) : extras.length ? (
        <p className="mt-3 text-xs text-muted">Stand out: add {extras.join(", ")}.</p>
      ) : null}

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          // A finished profile asks to go live; the database decides (live straight away, or held for a look).
          void persist(ready && status !== "live" ? "pending_review" : "draft");
        }}
      >
        <PhotoUploader
          profileId={stored?.id}
          profileName={displayName || stored?.displayName || "Draft"}
          area={placeShareName(citySlug, areaSlug)}
          city={cityNameBySlug(citySlug)}
          ensureProfile={ensureProfile}
        />

        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">First name</span>
          <input
            required
            aria-label="First name"
            value={displayName}
            onChange={(e) => patch({ displayName: e.target.value })}
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          />
          <p className="mt-2 text-xs text-muted">This is how you’ll appear. A nickname is fine.</p>
        </label>


        <div>
          <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Area</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {areas.map((area) => (
              <Chip
                key={area.slug}
                selected={areaSlug === area.slug}
                onClick={() => {
                  writeNearArea(area.slug);
                  patch({ areaSlug: area.slug });
                }}
              >
                {area.name}
              </Chip>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">About you</span>
          <textarea
            value={bio}
            onChange={(e) => patch({ bio: e.target.value })}
            maxLength={280}
            rows={4}
            placeholder="What you’re into, what a good weekend looks like, what you’re looking for."
            className="mt-2 w-full rounded-3xl border border-line bg-glass px-4 py-3 text-sm outline-none"
          />
        </label>

        <div>
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Prompts</span>
          <p className="mt-1 text-xs text-muted">Answer up to {MAX_PROMPTS}. They give people something to message you about.</p>
          {Array.from({ length: MAX_PROMPTS }).map((_, index) => {
            const current = prompts[index] ?? { q: "", a: "" };
            const update = (next: { q: string; a: string }) => {
              const list = [...prompts];
              list[index] = next;
              patch({ prompts: list.filter((p, i) => i <= Math.max(index, list.length - 1) && (p.q || p.a)) });
            };
            return (
              <div key={index} className="mt-3 rounded-3xl border border-line p-3">
                <select
                  value={current.q}
                  onChange={(e) => update({ ...current, q: e.target.value })}
                  className="h-10 w-full rounded-full border border-line bg-glass px-3 text-sm outline-none [color-scheme:dark]"
                >
                  <option value="">Choose a prompt</option>
                  {PROMPT_QUESTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                {current.q ? (
                  <textarea
                    value={current.a}
                    onChange={(e) => update({ ...current, a: e.target.value })}
                    maxLength={MAX_PROMPT_ANSWER}
                    rows={2}
                    className="mt-2 w-full rounded-2xl border border-line bg-glass px-3 py-2 text-sm outline-none"
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        <div>
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">I am</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {GENDERS.map((option) => (
              <Chip key={option.id} selected={gender === option.id} onClick={() => patch({ gender: option.id })}>
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Looking for</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTENTS.map((option) => (
              <Chip
                key={option.id}
                selected={lookingFor === option.id}
                onClick={() => patch({ lookingFor: option.id })}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        {note ? <p className="text-sm text-cream/90">{note}</p> : null}

        <div className="sticky bottom-24 z-10 -mx-1 rounded-full bg-bg/80 p-1 backdrop-blur">
          <Button className="w-full" variant="gold" disabled={busy || !displayName.trim() || !areaSlug}>
            {busy ? "Saving…" : status === "live" ? "Save changes" : ready && status !== "suspended" ? "Go live" : "Save"}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Your profile shows as soon as it’s complete. We check new profiles to keep Kutana real — fake or paid profiles are removed.
      </p>
      <Link href="/me" className="mt-6 inline-block text-sm text-muted">
        Back
      </Link>
      {gate ? <AuthGate intent="profile" onClose={() => setGate(false)} /> : null}
    </div>
  );
}
