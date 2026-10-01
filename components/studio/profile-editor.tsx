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
import { MAX_PROMPT_ANSWER, MAX_PROMPTS, PROMPT_QUESTIONS } from "@/lib/profile/prompts";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { PhotoUploader } from "@/components/studio/photo-uploader";

const statusLabel: Record<OwnerProfileStatus, string> = {
  draft: "Draft",
  pending_review: "In review",
  paused: "Paused",
};

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

export function ProfileEditor() {
  const { user, ready, configured } = useAuth();
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
  const lookingFor = fields?.lookingFor ?? stored?.lookingFor ?? null;
  const prompts = fields?.prompts ?? stored?.prompts ?? [];
  const indexPublic = fields?.indexPublic ?? stored?.indexPublic ?? false;
  const status = stored?.status ?? "draft";

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
  const missing = health.checks.filter((c) => !c.ok).map((c) => c.label);

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
    if (configured && ready && !user) {
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
    writeLocalDraft(result.data);
    setNote(
      result.data.status === "pending_review"
        ? "In review. Not public."
        : result.persisted
          ? "Saved as a draft."
          : "Saved as a draft on this device. Not public.",
    );
    return true;
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight">Your profile</h1>
      <p className="mt-2 text-sm text-muted">
        {status === "pending_review" ? "In review — we’ll let you know when you’re live." : `${statusLabel[status]} · not live yet`}
      </p>

      <div className="mt-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gold" style={{ width: `${health.score}%` }} />
        </div>
        <span className="text-xs text-muted">{health.score}%</span>
      </div>
      {missing.length > 0 ? <p className="mt-2 text-xs text-muted">Still to add: {missing.join(", ")}</p> : null}

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void persist("draft");
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

        <button
          type="button"
          onClick={() => patch({ indexPublic: !indexPublic })}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left text-sm"
        >
          Allow public search indexing
          <span className="text-muted">{indexPublic ? "On" : "Off"}</span>
        </button>

        {note ? <p className="text-sm text-cream/90">{note}</p> : null}

        {health.score >= 100 && status !== "pending_review" ? (
          <Button
            type="button"
            variant="gold"
            className="w-full"
            disabled={busy}
            onClick={() => void persist("pending_review")}
          >
            Submit — go live after a quick review
          </Button>
        ) : null}
        <Button
          className="w-full"
          variant={health.score >= 100 ? "ghost" : "gold"}
          disabled={busy || !displayName.trim() || !areaSlug}
        >
          Save
        </Button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        We check every profile and photo before it goes live. Usually within a day.
      </p>
      <Link href={status === "pending_review" ? "/me" : "/studio"} className="mt-6 inline-block text-sm text-muted">
        {status === "pending_review" ? "Me" : "Back"}
      </Link>
      {gate ? <AuthGate intent="profile" onClose={() => setGate(false)} /> : null}
    </div>
  );
}
