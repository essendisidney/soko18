"use client";

import { useT } from "@/lib/i18n/use-t";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
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
  const { user } = useAuth();

  // Signed in: start from the range saved on the account (for 18–25, ±4 years by default).
  useEffect(() => {
    if (!user) return;
    void fetch("/api/me/age-window")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { min: number; max: number } | null } | null) => {
        if (!json?.data) return;
        setMin(json.data.min);
        setMax(json.data.max);
      })
      .catch(() => {});
  }, [user]);

  async function save() {
    const lo = Math.max(18, Math.min(min, max));
    const hi = Math.min(99, Math.max(min, max));
    writeAgeRange({ min: lo, max: hi });
    writeShowMe(show);
    // Save before closing, so the refreshed deck already uses the new range.
    if (user) {
      await fetch("/api/me/age-window", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min: lo, max: hi }),
      }).catch(() => null);
    }
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
        <Button size="sm" variant="gold" onClick={() => void save()}>
          {t("filters.apply")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t("filters.cancel")}
        </Button>
      </div>
    </div>
  );
}
