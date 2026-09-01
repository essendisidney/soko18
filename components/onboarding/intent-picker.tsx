"use client";

import { useState, useSyncExternalStore } from "react";
import { INTENTS } from "@/lib/data/nairobi";
import { intentSnapshot, subscribeIntents, writeIntents } from "@/lib/onboarding";
import { Chip } from "@/components/soko/chip";
import { Button } from "@/components/soko/button";

function parseIntents(raw: string | null) {
  if (!raw) return [] as string[];
  return raw.split(",").filter(Boolean);
}

export function IntentPicker({
  onDone,
  doneLabel = "Discover",
}: {
  onDone: () => void;
  doneLabel?: string;
}) {
  const stored = useSyncExternalStore(subscribeIntents, intentSnapshot, () => null);
  const [draft, setDraft] = useState<string[] | null>(null);
  const selected = draft ?? parseIntents(stored);

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : selected.length >= 3
        ? selected
        : [...selected, id];
    setDraft(next);
    writeIntents(next);
  }

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-2">
        {INTENTS.map((intent) => (
          <Chip
            key={intent.id}
            selected={selected.includes(intent.id)}
            onClick={() => toggle(intent.id)}
          >
            {intent.label}
          </Chip>
        ))}
      </div>
      <div className="mt-auto pt-10">
        <Button type="button" className="w-full" variant="gold" disabled={selected.length === 0} onClick={onDone}>
          {doneLabel}
        </Button>
      </div>
    </>
  );
}
