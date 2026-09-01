"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NAIROBI_AREAS } from "@/lib/data/nairobi";
import { Button } from "@/components/soko/button";
import { Chip } from "@/components/soko/chip";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { saveProfileAction } from "@/lib/profile/actions";
import { draftHealth } from "@/lib/profile/health";
import { writeLocalDraft } from "@/lib/profile/local";
import { uniqueProfileSlug } from "@/lib/profile/slug";
import type { OwnerProfileStatus } from "@/lib/profile/types";
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
  availability: string;
  indexPublic: boolean;
};

export function ProfileEditor() {
  const { user, ready, configured } = useAuth();
  const stored = useDraftProfile();
  const [fields, setFields] = useState<Fields | null>(null);
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const displayName = fields?.displayName ?? stored?.displayName ?? "";
  const birthYear = fields?.birthYear ?? (stored?.birthYear ? String(stored.birthYear) : "");
  const areaSlug = fields?.areaSlug ?? stored?.areaSlug ?? "";
  const bio = fields?.bio ?? stored?.bio ?? "";
  const availability = fields?.availability ?? stored?.availability ?? "";
  const indexPublic = fields?.indexPublic ?? stored?.indexPublic ?? false;
  const status = stored?.status ?? "draft";

  function patch(next: Partial<Fields>) {
    setFields({
      displayName,
      birthYear,
      areaSlug,
      bio,
      availability,
      indexPublic,
      ...next,
    });
  }

  const slug = useMemo(() => uniqueProfileSlug(displayName || "profile"), [displayName]);
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
      areaSlug,
      bio,
      availability,
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
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">SOKO18 Studio</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Profile</h1>
      <p className="mt-2 text-sm text-muted">
        {statusLabel[status]} · Nairobi · not public
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
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Name</span>
          <input
            required
            value={displayName}
            onChange={(e) => patch({ displayName: e.target.value })}
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          />
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
            {NAIROBI_AREAS.map((area) => (
              <Chip
                key={area.slug}
                selected={areaSlug === area.slug}
                onClick={() => patch({ areaSlug: area.slug })}
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

        <label className="block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Availability</span>
          <input
            value={availability}
            onChange={(e) => patch({ availability: e.target.value })}
            placeholder="Evenings"
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          />
        </label>

        <PhotoUploader
          profileId={stored?.id}
          profileName={displayName || stored?.displayName || "Draft"}
          area={areaSlug}
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
