"use client";

import { useState } from "react";
import { Chip } from "@/components/soko/chip";
import { useMounted } from "@/lib/use-mounted";
import { useDataSaver } from "@/lib/data-saver/use-data-saver";
import { formatBytes, localDay, readSaverChoice, USAGE_KEY, writeSaverChoice, type SaverChoice } from "@/lib/data-saver/settings";

function todayBytes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USAGE_KEY) ?? "null") as { day: string; bytes: number } | null;
    return parsed && parsed.day === localDay() ? parsed.bytes : 0;
  } catch {
    return 0;
  }
}

/** Settings → Data saver. */
export function DataSaverSettings() {
  const mounted = useMounted();
  const on = useDataSaver();
  const [choice, setChoice] = useState<SaverChoice | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  if (mounted && choice === null) {
    setChoice(readSaverChoice());
    setUsed(todayBytes());
  }
  if (!mounted || choice === null) return null;

  const options: { id: SaverChoice; label: string }[] = [
    { id: "auto", label: "Auto" },
    { id: "on", label: "On" },
    { id: "off", label: "Off" },
  ];

  return (
    <section className="mt-8" aria-label="Data saver">
      <h2 className="text-sm text-muted">Data saver</h2>
      <p className="mt-2 text-sm text-muted">
        Photos in grids load when you tap them. Auto turns on when your phone saves data or you’re on 2G/3G.{" "}
        {on ? "On now." : "Off now."}
      </p>
      <div className="mt-3 flex gap-2">
        {options.map((o) => (
          <Chip
            key={o.id}
            selected={choice === o.id}
            onClick={() => {
              writeSaverChoice(o.id);
              setChoice(o.id);
            }}
          >
            {o.label}
          </Chip>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Today: about {formatBytes(used ?? 0)} used by Kutana on this phone.</p>
    </section>
  );
}
