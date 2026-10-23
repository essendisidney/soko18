"use client";

import { useState } from "react";
import { Button } from "@/components/soko/button";
import { useMounted } from "@/lib/use-mounted";
import { hashPin, newSalt, readDiscreet, validPin, writeDiscreet, type Discreet } from "@/lib/discreet/settings";

const input = "w-full rounded-2xl border border-line bg-glass px-3 py-2.5 text-sm tracking-[0.3em] outline-none";

/** Settings → Discreet mode. Everything here stays on this phone. */
export function DiscreetSettings() {
  const mounted = useMounted();
  const [settings, setSettings] = useState<Discreet | null>(null);
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [note, setNote] = useState("");
  if (mounted && settings === null) setSettings(readDiscreet());
  if (!settings) return null;

  function save(next: Discreet, message: string) {
    writeDiscreet(next);
    setSettings(next);
    setNote(message);
  }

  async function setLock() {
    if (!validPin(pin)) return setNote("Use 4 to 6 numbers.");
    if (pin !== again) return setNote("The two PINs don’t match.");
    const salt = newSalt();
    save({ ...settings, salt, pinHash: await hashPin(pin, salt), pinLength: pin.length }, "PIN lock is on for this phone.");
    try {
      sessionStorage.setItem("kutana_unlocked_at", String(Date.now()));
    } catch {}
    setPin("");
    setAgain("");
  }

  return (
    <section className="mt-8 space-y-5" aria-label="Discreet mode">
      <div>
        <h2 className="text-sm text-muted">Discreet mode</h2>
        <p className="mt-2 text-sm text-muted">These settings stay on this phone only. Notifications never show names or messages.</p>
      </div>

      <div className="rounded-3xl border border-line p-4">
        <p className="text-sm font-medium">App PIN</p>
        <p className="mt-1 text-xs text-muted">Asks for a PIN when you open Kutana, and after a minute away.</p>
        {settings.pinHash ? (
          <Button className="mt-3 w-full" variant="ghost" onClick={() => save({ ...settings, pinHash: undefined, salt: undefined, pinLength: undefined }, "PIN lock is off.")}>
            Turn off PIN
          </Button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input className={input} inputMode="numeric" type="password" autoComplete="off" maxLength={6} placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            <input className={input} inputMode="numeric" type="password" autoComplete="off" maxLength={6} placeholder="Again" value={again} onChange={(e) => setAgain(e.target.value.replace(/\D/g, ""))} />
            <Button className="col-span-2" variant="gold" disabled={!pin || !again} onClick={() => void setLock()}>
              Turn on PIN
            </Button>
          </div>
        )}
      </div>

      <label className="flex items-start justify-between gap-4 rounded-3xl border border-line p-4">
        <span>
          <span className="block text-sm font-medium">Quick exit button</span>
          <span className="mt-1 block text-xs text-muted">A small button at the top that jumps to a weather search in one tap.</span>
        </span>
        <input type="checkbox" className="mt-1 size-5 accent-[var(--color-gold,#d4b56a)]" checked={Boolean(settings.quickExit)} onChange={(e) => save({ ...settings, quickExit: e.target.checked }, e.target.checked ? "Quick exit is on." : "Quick exit is off.")} />
      </label>

      <label className="flex items-start justify-between gap-4 rounded-3xl border border-line p-4">
        <span>
          <span className="block text-sm font-medium">Neutral home screen icon</span>
          <span className="mt-1 block text-xs text-muted">Installs as “Notes” with a plain icon instead of Kutana.</span>
        </span>
        <input type="checkbox" className="mt-1 size-5 accent-[var(--color-gold,#d4b56a)]" checked={Boolean(settings.neutralIcon)} onChange={(e) => save({ ...settings, neutralIcon: e.target.checked }, e.target.checked ? "Neutral icon chosen. Now add Kutana to your home screen." : "Kutana icon chosen.")} />
      </label>
      <div className="text-xs leading-relaxed text-muted">
        <p className="font-medium text-cream/80">What phones allow</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>Choose the icon before you tap “Add to Home Screen”. The name and icon are fixed at that moment.</li>
          <li>Already installed? Remove Kutana from your home screen, then add it again.</li>
          <li>iPhone: Share → Add to Home Screen. You can also rename it there.</li>
          <li>Android: some phones still show the browser’s small badge on the icon, and app settings still say Kutana.</li>
          <li>The PIN protects the app, not your phone. Lock your phone too.</li>
        </ul>
      </div>
      {note ? <p className="text-sm text-gold">{note}</p> : null}
    </section>
  );
}
