"use client";

import { useT } from "@/lib/i18n/use-t";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";
import { needsConsent, type ConsentState } from "@/lib/account/consent-client";

/**
 * First sign-in: date of birth (server-checked 18+), Terms + Privacy, and explicit consent
 * for sensitive data (gender and who you want to see). Required before using the app.
 */
export function ConsentGate() {
  const { user, ready, configured } = useAuth();
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState("");
  const [terms, setTerms] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    if (!configured || !ready || !user) return;
    void fetch("/api/consent")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: ConsentState } | null) => setOpen(needsConsent(json?.data ?? null)))
      .catch(() => {});
  }, [configured, ready, user]);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateOfBirth: dob, terms, sensitive, marketing }),
    });
    const json = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? "Try again.");
      if (json?.error?.code === "underage") window.location.assign(window.location.origin);
      return;
    }
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg/95 px-6 py-10 backdrop-blur" role="dialog" aria-modal>
      <div className="mx-auto max-w-sm">
        <h2 className="font-display text-3xl tracking-tight">{t("consent.title")}</h2>
        <p className="mt-2 text-sm text-muted">{t("consent.intro")}</p>
        <label className="mt-6 block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">{t("welcome.dob")}</span>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none [color-scheme:dark]"
          />
        </label>
        <label className="mt-5 flex gap-3 text-sm">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-gold">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-gold">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <label className="mt-4 flex gap-3 text-sm">
          <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} className="mt-1" />
          <span>{t("consent.sensitive")}</span>
        </label>
        <label className="mt-4 flex gap-3 text-sm text-muted">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1" />
          <span>{t("consent.marketing")}</span>
        </label>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <Button
          className="mt-6 w-full"
          variant="gold"
          disabled={busy || !dob || !terms || !sensitive}
          onClick={() => void submit()}
        >
          {t("common.continue")}
        </Button>
      </div>
    </div>
  );
}
