"use client";

import { useEffect, useState } from "react";
import { Delete, LogOut } from "lucide-react";
import {
  checkPin,
  PIN_TRIES,
  PIN_WAIT_MS,
  QUICK_EXIT_URL,
  readDiscreet,
  shouldLock,
  UNLOCKED_KEY,
  writeDiscreet,
  type Discreet,
} from "@/lib/discreet/settings";
import { createClient } from "@/lib/supabase/client";

function readUnlockedAt() {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, String(Date.now()));
  } catch {}
}

function waitOver(until: number) {
  return Date.now() >= until;
}

function waitFromNow() {
  return Date.now() + PIN_WAIT_MS;
}

/** Swap the install name and icon to the neutral "Notes" ones before Add to Home Screen. */
function applyNeutralIcon(on: boolean) {
  // Remember each original value so switching back restores exactly what the page shipped with.
  const set = (selector: string, attr: string, neutral: string) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    if (el.dataset.original === undefined) el.dataset.original = el.getAttribute(attr) ?? "";
    el.setAttribute(attr, on ? neutral : el.dataset.original);
  };
  set('link[rel="manifest"]', "href", "/manifest-neutral.webmanifest");
  set('meta[name="apple-mobile-web-app-title"]', "content", "Notes");
  set('link[rel="apple-touch-icon"]', "href", "/neutral-icon/192");
}

/** Device-only discreet mode: PIN lock, quick exit, neutral icon. Renders nothing when off. */
export function DiscreetRuntime() {
  const [settings, setSettings] = useState<Discreet>({});
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = readDiscreet();
      setSettings(next);
      applyNeutralIcon(Boolean(next.neutralIcon));
      setLocked(shouldLock(next, readUnlockedAt()));
    };
    sync();
    // Leaving the app counts as the last moment it was open; coming back after a minute locks it.
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (!shouldLock(readDiscreet(), readUnlockedAt())) markUnlocked();
      } else {
        setLocked(shouldLock(readDiscreet(), readUnlockedAt()));
      }
    };
    window.addEventListener("kutana-discreet", sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("kutana-discreet", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      {settings.quickExit && !locked ? <QuickExit /> : null}
      {locked ? <LockScreen settings={settings} onUnlock={() => setLocked(false)} /> : null}
    </>
  );
}

function QuickExit() {
  return (
    <button
      type="button"
      aria-label="Quick exit"
      onClick={() => {
        try {
          sessionStorage.removeItem(UNLOCKED_KEY);
        } catch {}
        window.location.replace(QUICK_EXIT_URL);
      }}
      className="fixed top-[max(0.5rem,env(safe-area-inset-top))] right-2 z-[70] grid size-9 place-items-center rounded-full border border-white/15 bg-black/60 text-cream/80 backdrop-blur"
    >
      <LogOut className="size-4" />
    </button>
  );
}

function LockScreen({ settings, onUnlock }: { settings: Discreet; onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [tries, setTries] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [note, setNote] = useState("");

  async function submit(value: string) {
    if (!waitOver(waitUntil)) return setNote("Too many tries. Wait 30 seconds.");
    if (await checkPin(value, settings)) {
      markUnlocked();
      onUnlock();
      return;
    }
    const next = tries + 1;
    setTries(next);
    setPin("");
    if (next >= PIN_TRIES) {
      setWaitUntil(waitFromNow());
      setTries(0);
      setNote("Too many tries. Wait 30 seconds.");
    } else setNote("Wrong PIN.");
  }

  function press(digit: string) {
    const next = (pin + digit).slice(0, 6);
    setPin(next);
    setNote("");
    if (next.length === (settings.pinLength ?? 6)) void submit(next);
  }

  async function forgot() {
    // Clearing the PIN signs this device out, so a forgotten PIN never exposes chats.
    writeDiscreet({ ...settings, pinHash: undefined, salt: undefined, pinLength: undefined });
    try {
      await createClient().auth.signOut();
    } catch {}
    window.location.replace("/login");
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Enter PIN" className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-bg px-6">
      <p className="font-display text-2xl">Enter PIN</p>
      <div className="mt-5 flex gap-3" aria-hidden>
        {Array.from({ length: settings.pinLength ?? 6 }).map((_, i) => (
          <span key={i} className={`size-3 rounded-full ${i < pin.length ? "bg-gold" : "bg-white/15"}`} />
        ))}
      </div>
      {note ? <p className="mt-3 text-sm text-muted">{note}</p> : <p className="mt-3 text-sm text-transparent">.</p>}
      <div className="mt-6 grid w-full max-w-[260px] grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="aspect-square rounded-full bg-white/[0.06] font-display text-2xl active:bg-white/15">
            {d}
          </button>
        ))}
        <button type="button" onClick={() => void forgot()} className="text-xs text-muted">
          Forgot?
        </button>
        <button type="button" onClick={() => press("0")} className="aspect-square rounded-full bg-white/[0.06] font-display text-2xl active:bg-white/15">
          0
        </button>
        <button type="button" aria-label="Delete" onClick={() => setPin((p) => p.slice(0, -1))} className="grid place-items-center text-muted">
          <Delete className="size-5" />
        </button>
      </div>
    </div>
  );
}
