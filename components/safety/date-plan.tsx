"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";
import { useMounted } from "@/lib/use-mounted";
import { readEmergencyContact, writeEmergencyContact } from "@/lib/safety/emergency";
import { defaultCheckIn, toLocalInput, untilLabel, type DatePlan } from "@/lib/safety/date-plan-shared";
import { nairobiTime } from "@/lib/safety/outbox-text";

type Loaded = { plan: DatePlan | null; alertsReady: boolean };

const input = "w-full rounded-2xl border border-line bg-glass px-3 py-2.5 text-sm outline-none";

/** Date plan + check-in: where, when, who to tell, and "I'm safe". Free for everyone. */
export function DatePlanner() {
  const { user, ready, configured } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [place, setPlace] = useState("");
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [checkIn, setCheckIn] = useState(() => toLocalInput(defaultCheckIn(new Date(Date.now() + 60 * 60 * 1000))));
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  function load() {
    void fetch("/api/safety/date")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Loaded } | null) => setLoaded(json?.data ?? { plan: null, alertsReady: false }))
      .catch(() => setLoaded({ plan: null, alertsReady: false }));
  }

  // Seed the trusted contact saved on this device once, after hydration.
  const mounted = useMounted();
  const [seeded, setSeeded] = useState(false);
  if (mounted && !seeded) {
    setSeeded(true);
    const saved = readEmergencyContact();
    if (saved) {
      setContactName(saved.name);
      setContactPhone(saved.phone);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (configured && ready && !user) {
    return (
      <section className="mt-6 rounded-3xl border border-line p-5 text-sm">
        <p className="text-muted">Sign in to plan a date with a check-in.</p>
        <Link href="/login?next=/safety/date" className="mt-3 inline-block text-gold">
          Sign in
        </Link>
      </section>
    );
  }

  async function start() {
    setBusy(true);
    setNote("");
    const res = await fetch("/api/safety/date", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place,
        startsAt: new Date(startsAt).toISOString(),
        checkInAt: new Date(checkIn).toISOString(),
        contactName,
        contactPhone,
      }),
    });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok) return setNote(json?.error?.message ?? "Could not save.");
    writeEmergencyContact({ name: contactName.trim(), phone: contactPhone.trim() });
    load();
  }

  async function act(id: string, action: "safe" | "extend" | "cancel") {
    setBusy(true);
    setNote("");
    const res = await fetch("/api/safety/date", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok) return setNote(json?.error?.message ?? "Try again.");
    if (action === "safe") setNote("Glad you’re safe. Plan closed.");
    load();
  }

  const plan = loaded?.plan ?? null;

  return (
    <section className="mt-6 space-y-4" aria-label="Date plan">
      {loaded && !loaded.alertsReady ? (
        <p className="rounded-2xl border border-gold/40 bg-gold/5 p-3 text-xs text-cream/90">
          Heads up: alerts to your contact aren’t switched on yet. We’ll still remind you to check in. Until then, also share your plan with them yourself.
        </p>
      ) : null}

      {plan ? (
        <div className="rounded-3xl border border-gold/50 bg-gold/5 p-5">
          <p className="text-[11px] tracking-[0.18em] text-gold uppercase">{plan.status === "missed" ? "Check-in missed" : "Date plan on"}</p>
          <p className="mt-2 font-display text-xl">{plan.place}</p>
          <p className="mt-1 text-sm text-muted">
            {nairobiTime(plan.startsAt)} · check in {untilLabel(plan.checkInAt)} · contact: {plan.contactName || "saved"}
          </p>
          {plan.status === "missed" ? (
            <p className="mt-2 text-sm text-cream/90">We’ve alerted your contact. Tap “I’m safe” and we’ll tell them you’re OK.</p>
          ) : null}
          <Button className="mt-4 w-full" variant="gold" disabled={busy} onClick={() => void act(plan.id, "safe")}>
            <ShieldCheck className="size-4" /> I’m safe
          </Button>
          {plan.status === "active" ? (
            <div className="mt-2 flex gap-2">
              {plan.canExtend ? (
                <Button className="flex-1" variant="ghost" disabled={busy} onClick={() => void act(plan.id, "extend")}>
                  30 more minutes
                </Button>
              ) : null}
              <Button className="flex-1" variant="ghost" disabled={busy} onClick={() => void act(plan.id, "cancel")}>
                Cancel plan
              </Button>
            </div>
          ) : null}
        </div>
      ) : loaded ? (
        <form
          className="space-y-3 rounded-3xl border border-line p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void start();
          }}
        >
          <label className="block text-sm">
            <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Where</span>
            <input className={`${input} mt-1`} value={place} maxLength={120} onChange={(e) => setPlace(e.target.value)} placeholder="Java House, Westlands" />
          </label>
          <label className="block text-sm">
            <span className="text-[11px] tracking-[0.18em] text-muted uppercase">When</span>
            <input
              className={`${input} mt-1`}
              type="datetime-local"
              value={startsAt}
              onChange={(e) => {
                setStartsAt(e.target.value);
                const at = new Date(e.target.value);
                if (!Number.isNaN(at.getTime())) setCheckIn(toLocalInput(defaultCheckIn(at)));
              }}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Check in by</span>
            <input className={`${input} mt-1`} type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Trusted contact</span>
              <input className={`${input} mt-1`} value={contactName} maxLength={40} onChange={(e) => setContactName(e.target.value)} placeholder="Name" />
            </label>
            <label className="block text-sm">
              <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Phone</span>
              <input className={`${input} mt-1`} value={contactPhone} inputMode="tel" maxLength={20} onChange={(e) => setContactPhone(e.target.value)} placeholder="0712 345 678" />
            </label>
          </div>
          <p className="text-xs text-muted">
            If you don’t tap “I’m safe” within 15 minutes of your check-in time, we send your contact where and when. Nothing else from Kutana.
          </p>
          <Button className="w-full" variant="gold" disabled={busy || !place.trim() || !contactName.trim() || !contactPhone.trim()}>
            {busy ? "Saving…" : "Start date plan"}
          </Button>
        </form>
      ) : (
        <div className="h-40 animate-pulse rounded-3xl bg-white/5" />
      )}
      {note ? <p className="text-sm text-cream/90">{note}</p> : null}
    </section>
  );
}
