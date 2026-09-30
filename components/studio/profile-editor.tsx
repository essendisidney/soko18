"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { areasForCity, cityNameBySlug, placeShareName } from "@/lib/geo/kenya";
import { citySnapshot, subscribeNearArea, writeNearArea } from "@/lib/nairobi/near";
import { Button } from "@/components/soko/button";
import { Chip } from "@/components/soko/chip";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { saveProfileAction } from "@/lib/profile/actions";
import { draftHealth } from "@/lib/profile/health";
import { writeLocalDraft } from "@/lib/profile/local";
import { uniqueProfileSlug } from "@/lib/profile/slug";
import type { OwnerProfileStatus, ProfileDraft } from "@/lib/profile/types";
import { INTENTS } from "@/lib/data/nairobi";
import { MAX_PROMPT_ANSWER, MAX_PROMPTS, PROMPT_QUESTIONS } from "@/lib/profile/prompts";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { PhotoUploader } from "@/components/studio/photo-uploader";

const maxYear = new Date().getFullYear() - 18;

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

  const slug = useMemo(
    () => uniqueProfileSlug(displayName || "profile", undefined, citySlug),
    [displayName, citySlug],
  );
  const health = draftHealth({
    displayName,
    birthYear: birthYear ? Number(birthYear) : null,
    areaSlug,
    bio,
  });

  async function persist(nextStatus: OwnerProfileStatus) {
    if (configured && ready && !user) {
      setGate(true);
      return;
    }
    setBusy(true);
    setNote("");
    const result = await saveProfileAction({
      id: stored?.id,
      displayName,
      birthYear: birthYear ? Number(birthYear) : null,
      citySlug,
      areaSlug,
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
      return;
    }
    writeLocalDraft(result.data);
    setNote(
      result.data.status === "pending_review"
        ? "In review. Not public."
        : result.persisted
          ? "Saved as a draft."
          : "Saved as a draft on this device. Not public.",
    );
  }

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Your profile</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Profile</h1>
      <p className="mt-2 text-sm text-muted">
        {statusLabel[status]} · {cityNameBySlug(citySlug)} · not public
      </p>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gold" style={{ width: `${health.score}%` }} />
      </div>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void persist("draft");
        }}
      >
        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Username</span>
          <input
            required
            aria-label="Username"
            value={displayName}
            onChange={(e) => patch({ displayName: e.target.value })}
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          />
          <p className="mt-2 text-xs text-muted">A nickname. Not your legal name.</p>
        </label>

        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Born</span>
          <input
            type="number"
            inputMode="numeric"
            min={1940}
            max={maxYear}
            value={birthYear}
            onChange={(e) => patch({ birthYear: e.target.value })}
            placeholder={String(maxYear)}
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          />
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
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">About</span>
          <textarea
            value={bio}
            onChange={(e) => patch({ bio: e.target.value })}
            maxLength={280}
            rows={4}
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

        <PhotoUploader
          profileId={stored?.id}
          profileName={displayName || stored?.displayName || "Draft"}
          area={placeShareName(citySlug, areaSlug)}
          city={cityNameBySlug(citySlug)}
        />

        <button
          type="button"
          onClick={() => patch({ indexPublic: !indexPublic })}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left text-sm"
        >
          Allow public search indexing
          <span className="text-muted">{indexPublic ? "On" : "Off"}</span>
        </button>

        <p className="text-xs text-muted">soko18.app/profile/{slug}</p>

        {note ? <p className="text-sm text-cream/90">{note}</p> : null}

        <Button className="w-full" disabled={busy || !displayName.trim() || !areaSlug}>
          Save draft
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={busy || health.score < 100}
          onClick={() => void persist("pending_review")}
        >
          Submit for review
        </Button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Photos stay in review until SOKO18 approves them. They never appear on Discover first.
      </p>
      <Link href="/discover" className="mt-6 block">
        <Button
          className="w-full"
          variant={status === "pending_review" || note.startsWith("In review") ? "gold" : "ghost"}
        >
          Discover
        </Button>
      </Link>
      <Link href={status === "pending_review" ? "/me" : "/studio"} className="mt-6 inline-block text-sm text-muted">
        {status === "pending_review" ? "Me" : "Back"}
      </Link>
      {gate ? <AuthGate intent="profile" onClose={() => setGate(false)} /> : null}
    </div>
  );
}
