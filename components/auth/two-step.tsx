"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";
import { createClient } from "@/lib/supabase/client";

type Enrolling = { factorId: string; qr: string; secret: string };

/** 2-step sign-in with an authenticator app (Google Authenticator, Authy, 1Password…). */
export function TwoStep() {
  const { user, configured } = useAuth();
  const [enabled, setEnabled] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!configured || !user) return;
    const { data } = await createClient().auth.mfa.listFactors();
    setEnabled(data?.totp?.find((f) => f.status === "verified")?.id ?? null);
  }, [configured, user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!configured || !user) return null;

  async function start() {
    setBusy(true);
    setNote(null);
    const { data, error } = await createClient().auth.mfa.enroll({ factorType: "totp", friendlyName: "SOKO18" });
    setBusy(false);
    if (error || !data) {
      setNote("Could not start 2-step sign-in.");
      return;
    }
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify() {
    if (!enrolling) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrolling.factorId, code: code.trim() });
    setBusy(false);
    if (error) {
      setNote("That code didn’t work. Check the time on your phone and try again.");
      return;
    }
    setEnrolling(null);
    setCode("");
    setNote("2-step sign-in is on.");
    void load();
  }

  async function turnOff() {
    if (!enabled) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: enabled });
    setBusy(false);
    setNote(error ? "Enter your code first (sign out and back in), then try again." : "2-step sign-in is off.");
    void load();
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm text-muted">2-step sign-in</h2>
      <p className="mt-2 text-sm text-muted">
        {enabled ? "On. You’ll enter a code from your authenticator app when you sign in." : "Protect your account with a code from an authenticator app."}
      </p>
      {enrolling ? (
        <div className="mt-4 rounded-3xl border border-line p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qr} alt="Scan with your authenticator app" className="mx-auto size-44 rounded-xl bg-white p-2" />
          <p className="mt-3 text-center text-xs break-all text-muted">Or enter: {enrolling.secret}</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            className="mt-3 h-12 w-full rounded-full border border-line bg-glass px-4 text-center text-lg tracking-[0.3em] outline-none"
          />
          <Button className="mt-3 w-full" variant="gold" disabled={busy || code.trim().length < 6} onClick={() => void verify()}>
            Turn on
          </Button>
        </div>
      ) : enabled ? (
        <Button className="mt-4 w-full" variant="ghost" disabled={busy} onClick={() => void turnOff()}>
          Turn off 2-step sign-in
        </Button>
      ) : (
        <Button className="mt-4 w-full" variant="ghost" disabled={busy} onClick={() => void start()}>
          Set up 2-step sign-in
        </Button>
      )}
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
