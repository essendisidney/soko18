"use client";

import { useT } from "@/lib/i18n/use-t";

import { useState } from "react";
import { Button } from "@/components/soko/button";
import { Chip } from "@/components/soko/chip";
import { SHOW_ME } from "@/lib/data/nairobi";
import { readAgeRange, readShowMe, writeAgeRange, writeShowMe, type ShowMe } from "@/lib/onboarding";

/** Who shows up on Discover: gender and age range. Free for everyone. */
export function FiltersSheet({ onClose }: { onClose: () => void }) {
  const initial = readAgeRange();
  const [min, setMin] = useState(initial.min);
  const [max, setMax] = useState(initial.max);
  const [show, setShow] = useState<ShowMe>(readShowMe());
  const t = useT();

  function save() {
    const lo = Math.max(18, Math.min(min, max));
    const hi = Math.min(99, Math.max(min, max));
    writeAgeRange({ min: lo, max: hi });
    writeShowMe(show);
    onClose();
  }

  return (
    <div className="glass mt-3 rounded-2xl p-4 text-sm" role="dialog" aria-label="Filters">
      <p className="text-[11px] tracking-[0.18em] text-muted uppercase">{t("filters.showMe")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SHOW_ME.map((option) => (
          <Chip key={option.id} selected={show === option.id} onClick={() => setShow(option.id)}>
            {t(`showMe.${option.id}`)}
          </Chip>
        ))}
      </div>
      <p className="mt-4 text-[11px] tracking-[0.18em] text-muted uppercase">
        {t("filters.age")} {min}–{max}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={18}
          max={99}
          value={min}
          aria-label="Minimum age"
          onChange={(e) => setMin(Number(e.target.value))}
          className="w-full accent-[var(--color-gold,#d4b56a)]"
        />
        <input
          type="range"
          min={18}
          max={99}
          value={max}
          aria-label="Maximum age"
          onChange={(e) => setMax(Number(e.target.value))}
          className="w-full accent-[var(--color-gold,#d4b56a)]"
        />
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant="gold" onClick={save}>
          {t("filters.apply")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t("filters.cancel")}
        </Button>
      </div>
    </div>
  );
}
