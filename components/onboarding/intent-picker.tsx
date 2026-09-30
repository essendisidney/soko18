"use client";

import { useState, useSyncExternalStore } from "react";
import { INTENTS, SHOW_ME } from "@/lib/data/nairobi";
import {
  intentSnapshot,
  showMeSnapshot,
  subscribeIntents,
  writeIntents,
  writeShowMe,
  type ShowMe,
} from "@/lib/onboarding";
import { Chip } from "@/components/soko/chip";
import { Button } from "@/components/soko/button";

function parseIntents(raw: string | null) {
  if (!raw) return [] as string[];
  const valid = new Set<string>(INTENTS.map((intent) => intent.id));
  return raw.split(",").filter((id) => valid.has(id));
}

function parseShowMe(raw: string | null): ShowMe | null {
  return raw === "woman" || raw === "man" || raw === "any" ? raw : null;
}

export function IntentPicker({
  onDone,
  doneLabel = "Discover",
}: {
  onDone: () => void;
  doneLabel?: string;
}) {
  const stored = useSyncExternalStore(subscribeIntents, intentSnapshot, () => null);
  const storedShow = useSyncExternalStore(subscribeIntents, showMeSnapshot, () => null);
  const [draft, setDraft] = useState<string[] | null>(null);
  const selected = draft ?? parseIntents(stored);
  const showMe = parseShowMe(storedShow);

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : selected.length >= 2
        ? selected
        : [...selected, id];
    setDraft(next);
    writeIntents(next);
  }

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-2">
        {INTENTS.map((intent) => (
          <Chip key={intent.id} selected={selected.includes(intent.id)} onClick={() => toggle(intent.id)}>
            {intent.label}
          </Chip>
        ))}
      </div>
      <p className="mt-10 text-[11px] tracking-[0.18em] text-muted uppercase">Show me</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SHOW_ME.map((option) => (
          <Chip key={option.id} selected={showMe === option.id} onClick={() => writeShowMe(option.id)}>
            {option.label}
          </Chip>
        ))}
      </div>
      <div className="mt-auto pt-10">
        <Button
          type="button"
          className="w-full"
          variant="gold"
          disabled={selected.length === 0 || !showMe}
          onClick={onDone}
        >
          {doneLabel}
        </Button>
      </div>
    </>
  );
}
