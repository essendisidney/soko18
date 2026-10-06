"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/soko/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { postEmergency, readDeviceLocation } from "@/lib/safety/client";
import {
  readEmergencyContact,
  readEmergencyContacts,
  readExtraEmergencyContact,
  writeEmergencyContact,
  writeExtraEmergencyContact,
} from "@/lib/safety/emergency";

export function SafetyTools() {
  const { user, ready, configured } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [extraName, setExtraName] = useState("");
  const [extraPhone, setExtraPhone] = useState("");
  // Safety is free for everyone. A second trusted contact is always available.
  const pack = true;
  const [note, setNote] = useState<string | null>(null);
  const [gate, setGate] = useState<"panic" | "share" | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Seed from this device once, after hydration (never during server render).
  const mounted = useMounted();
  const [seeded, setSeeded] = useState(false);
  if (mounted && !seeded) {
    setSeeded(true);
    const stored = readEmergencyContact();
    if (stored) {
      setName(stored.name);
      setPhone(stored.phone);
    }
    const extra = readExtraEmergencyContact();
    if (extra) {
      setExtraName(extra.name);
      setExtraPhone(extra.phone);
    }
  }

  function saveContact() {
    if (!name.trim() || phone.replace(/\D/g, "").length < 7) {
      setNote("Name and phone.");
      return;
    }
    writeEmergencyContact({ name: name.trim(), phone: phone.trim() });
    if (pack && extraName.trim() && extraPhone.replace(/\D/g, "").length >= 7) {
      writeExtraEmergencyContact({ name: extraName.trim(), phone: extraPhone.trim() });
    }
    setNote("Trusted contact saved on this device.");
  }

  async function ping(kind: "panic" | "share") {
    if (configured && ready && !user) {
      setGate(kind);
      return false;
    }
    const contacts = readEmergencyContacts();
    if (contacts.length === 0) {
      setNote("Save a trusted contact first.");
      return false;
    }
    setBusy(true);
    setNote(null);
    const loc = await readDeviceLocation();
    if (!loc) {
      setBusy(false);
      setNote("Location is required.");
      return false;
    }
    const results = [];
    for (const row of contacts) {
      results.push(
        await postEmergency(kind, {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          name: row.name,
          phone: row.phone,
        }),
      );
    }
    const res = results[0]!;
    const failed = results.find((row) => !row.ok);
    setBusy(false);
    if (res.status === 401) {
      setGate(kind);
      return false;
    }
    if (failed || !res.ok) {
      setNote("Could not send.");
      return false;
    }
    const delivered = results.some((row) => row.delivered);
    setNote(
      delivered
        ? kind === "panic"
          ? `Alert sent to ${contacts.length} trusted contact${contacts.length > 1 ? "s" : ""}.`
          : `Location sent to ${contacts.length} trusted contact${contacts.length > 1 ? "s" : ""}.`
        : "Recorded. Connect the emergency webhook to deliver it.",
    );
    return true;
  }

  // The first ping goes out from the button; this keeps sharing every 45 seconds.
  useEffect(() => {
    if (!sharing) return;
    const id = window.setInterval(() => {
      void ping("share");
    }, 45_000);
    return () => window.clearInterval(id);
    // ping reads latest contact from storage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharing]);

  return (
    <section className="mt-10" id="panic">
      <h2 className="text-sm text-muted">Panic</h2>
      <p className="mt-2 text-sm text-muted">
        One tap sends your location to a trusted contact. Not a public pin. Not a map of other people.
      </p>
      <label className="mt-4 block">
        <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Trusted name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
        />
      </label>
      <label className="mt-4 block">
        <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Trusted phone</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
        />
      </label>
      <Button className="mt-4 w-full" variant="ghost" onClick={saveContact}>
        Save contact
      </Button>
      {pack ? (
        <>
          <label className="mt-4 block">
            <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Second trusted name</span>
            <input
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Second trusted phone</span>
            <input
              value={extraPhone}
              onChange={(e) => setExtraPhone(e.target.value)}
              inputMode="tel"
              className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
            />
          </label>
        </>
      ) : null}
      <Button className="mt-3 w-full" variant="gold" disabled={busy} onClick={() => void ping("panic")}>
        Panic
      </Button>

      <h2 className="mt-10 text-sm text-muted">Share location</h2>
      <p className="mt-2 text-sm text-muted">
        Live share with that contact only. Updates while this is on. Never on Discover.
      </p>
      <Button
        className="mt-4 w-full"
        variant={sharing ? "gold" : "ghost"}
        disabled={busy}
        onClick={() => {
          if (sharing) {
            setSharing(false);
            return;
          }
          const contact = readEmergencyContacts();
          if (contact.length === 0) {
            setNote("Save a trusted contact first.");
            return;
          }
          setSharing(true);
          void ping("share");
        }}
      >
        {sharing ? "Stop sharing" : "Share live location"}
      </Button>
      {note ? <p className="mt-3 text-xs text-muted">{note}</p> : null}
      {gate ? <AuthGate intent={gate} onClose={() => setGate(null)} /> : null}
    </section>
  );
}
