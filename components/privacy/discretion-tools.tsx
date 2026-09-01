"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { hashContact } from "@/lib/privacy/contacts";
import { readContactHashes, readIncognito, writeContactHashes, writeIncognito } from "@/lib/privacy/local";
import { formatKes } from "@/lib/payments/ledger";
import { ACCESS_CATALOG, PRIVACY_CATALOG } from "@/lib/payments/catalog";
import { SkipLineButton } from "@/components/payments/skip-line-button";
import { LocalPayButton } from "@/components/payments/local-pay-button";
import { hasLocalAccess } from "@/lib/payments/access-local";

export function DiscretionTools() {
  const [incognito, setIncognito] = useState(false);
  const [paidGhost, setPaidGhost] = useState(false);
  const [phone, setPhone] = useState("");
  const [count, setCount] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setPaidGhost(hasLocalAccess("incognito"));
    setIncognito(readIncognito());
    setCount(readContactHashes().length);
  }, []);

  async function addNumber() {
    const hash = await hashContact(phone);
    if (!hash) {
      setNote("Use a Kenyan mobile number.");
      return;
    }
    const next = [...readContactHashes(), hash];
    writeContactHashes(next);
    setCount(next.length);
    setPhone("");
    setNote("Saved as a hash. The number is not stored.");
  }

  async function uploadContacts() {
    const nav = navigator as Navigator & {
      contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ tel?: string[] }>> };
    };
    if (!nav.contacts) {
      setNote("This browser cannot read contacts. Add numbers one by one.");
      return;
    }
    try {
      const picked = await nav.contacts.select(["tel"], { multiple: true });
      const hashes: string[] = [...readContactHashes()];
      for (const row of picked) {
        for (const tel of row.tel ?? []) {
          const hash = await hashContact(tel);
          if (hash) hashes.push(hash);
        }
      }
      writeContactHashes(hashes);
      setCount(readContactHashes().length);
      setNote("Contacts hashed on this device.");
    } catch {
      setNote("Contacts were not shared.");
    }
  }

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="text-sm text-muted">Incognito</h2>
        <p className="mt-2 text-sm text-muted">
          Hidden unless you like first. {formatKes(PRIVACY_CATALOG.incognito.amountKes)} / month. Sandbox settle until STK.
        </p>
        {paidGhost ? (
          <Button
            className="mt-4 w-full"
            variant={incognito ? "gold" : "ghost"}
            onClick={() => {
              const next = !incognito;
              writeIncognito(next);
              setIncognito(next);
            }}
          >
            {incognito ? "You’re invisible" : "Go incognito"}
          </Button>
        ) : (
          <LocalPayButton
            kind="incognito"
            idleLabel="Go incognito"
            settledLabel="You’re invisible"
            onSettled={() => {
              writeIncognito(true);
              setPaidGhost(true);
              setIncognito(true);
            }}
          />
        )}
      </div>

      <div>
        <h2 className="text-sm text-muted">Hide numbers</h2>
        <p className="mt-2 text-sm text-muted">
          Your people will not see you here. We store hashes only. {count} blocked.
        </p>
        <label className="mt-4 block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Phone to never see</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          />
        </label>
        <Button className="mt-3 w-full" variant="ghost" onClick={() => void addNumber()}>
          Block number
        </Button>
        <Button className="mt-3 w-full" variant="ghost" onClick={() => void uploadContacts()}>
          Hash my contacts
        </Button>
      </div>

      <div>
        <h2 className="text-sm text-muted">Stay private</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>Use a nickname. Not your legal name.</li>
          <li>Skip employer and job title.</li>
          <li>Don’t reuse LinkedIn or Instagram photos.</li>
          <li>A separate email for this app.</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Mystery match {formatKes(ACCESS_CATALOG.mystery.amountKes)}. Skip the line{" "}
          {formatKes(ACCESS_CATALOG.skip.amountKes)}. No fake wait counts.
        </p>
        <SkipLineButton
          idleLabel="Go first in review"
          onSettled={() => setNote("Staff see you first when you submit. Never a fake queue.")}
        />
      </div>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </section>
  );
}
