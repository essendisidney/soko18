"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/soko/button";
import { areasForCity, kenyaDoorCities } from "@/lib/geo/kenya";
import { locateHere } from "@/lib/geo/locate";
import { writeCity, writeNearArea } from "@/lib/nairobi/near";
import { cn } from "@/lib/utils";

/** Pick where you are: your location, or any city and area. Area-level only. */
export function PlaceSheet({
  citySlug,
  near,
  onClose,
}: {
  citySlug: string;
  near: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [city, setCity] = useState(citySlug || "nairobi");
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const cities = kenyaDoorCities();
  const areas = areasForCity(city);

  function done() {
    router.refresh();
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-t border-line bg-bg px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Where are you?</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full border border-line">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">We only ever show your area, never your exact location.</p>

        <Button
          className="mt-4 w-full"
          variant="gold"
          disabled={locating}
          onClick={async () => {
            setLocating(true);
            setNote(null);
            const result = await locateHere();
            setLocating(false);
            if (result.ok) {
              done();
              return;
            }
            setNote(
              result.error === "denied"
                ? "Location is blocked for this site. Pick your city below instead."
                : "Couldn’t get your location. Pick your city below.",
            );
          }}
        >
          <LocateFixed className="size-4" /> {locating ? "Finding you…" : "Use my location"}
        </Button>
        {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}

        <h3 className="mt-6 text-[11px] tracking-[0.18em] text-muted uppercase">City</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {cities.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCity(c.slug)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm",
                c.slug === city ? "border-gold bg-gold text-bg" : "border-line text-cream/90",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {areas.length > 0 ? (
          <>
            <h3 className="mt-6 text-[11px] tracking-[0.18em] text-muted uppercase">Area</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {areas.map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => {
                    writeCity(city);
                    writeNearArea(a.slug);
                    done();
                  }}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm",
                    city === citySlug && a.slug === near ? "border-gold text-gold" : "border-line text-cream/90",
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <Button
          className="mt-6 w-full"
          variant="ghost"
          onClick={() => {
            writeCity(city);
            done();
          }}
        >
          Anywhere in {cities.find((c) => c.slug === city)?.name ?? "Kenya"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
