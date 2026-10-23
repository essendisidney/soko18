"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/soko/button";
import { COST_CATEGORIES } from "@/lib/admin/economics";

/** Type in this month's costs. Stored per month and category; re-saving replaces the amount. */
export function CostForm({ month, current }: { month: string; current: Record<string, number> }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(COST_CATEGORIES.map((c) => [c, current[c] ? String(current[c]) : ""])),
  );
  const [note, setNote] = useState("");

  async function save() {
    setNote("");
    for (const category of COST_CATEGORIES) {
      const raw = values[category].trim();
      if (raw === "" && !current[category]) continue;
      const amountKes = Number(raw || 0);
      if (!Number.isFinite(amountKes) || amountKes < 0) return setNote(`Check ${category}.`);
      const res = await fetch("/api/admin/economics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, category, amountKes }),
      });
      if (!res.ok) return setNote("Only admins can save costs.");
    }
    setNote("Saved.");
    router.refresh();
  }

  return (
    <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 text-sm md:grid-cols-5">
      {COST_CATEGORIES.map((c) => (
        <label key={c} className="text-xs text-muted capitalize">
          {c}
          <input
            inputMode="decimal"
            className="mt-1 w-full rounded-xl border border-line bg-glass px-2 py-1.5 text-sm text-cream"
            value={values[c]}
            placeholder="KES"
            onChange={(e) => setValues((v) => ({ ...v, [c]: e.target.value.replace(/[^\d.]/g, "") }))}
          />
        </label>
      ))}
      <div className="col-span-2 flex items-center gap-3 md:col-span-5">
        <Button size="sm" variant="gold" onClick={() => void save()}>
          Save costs
        </Button>
        {note ? <span className="text-xs text-muted">{note}</span> : null}
      </div>
    </div>
  );
}
