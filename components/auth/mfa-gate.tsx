"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";
import { createClient } from "@/lib/supabase/client";

/** Members with 2-step sign-in must enter their code before using the app. */
export function MfaGate() {
  const { user, ready, configured } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !ready || !user) return;
    const supabase = createClient();
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(async ({ data }) => {
      if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        setFactorId(factors?.totp?.find((f) => f.status === "verified")?.id ?? null);
      }
    });
  }, [configured, ready, user]);

  if (!factorId) return null;

  async function verify() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (err) {
      setError("That code didn’t work.");
      return;
    }
    setFactorId(null);
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-bg/95 px-6 backdrop-blur" role="dialog" aria-modal>
      <div className="w-full max-w-sm">
        <h2 className="font-display text-3xl tracking-tight">Enter your code</h2>
        <p className="mt-2 text-sm text-muted">Open your authenticator app and type the 6-digit SOKO18 code.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          className="mt-6 h-12 w-full rounded-full border border-line bg-glass px-4 text-center text-lg tracking-[0.3em] outline-none"
        />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <Button className="mt-4 w-full" variant="gold" disabled={busy || code.trim().length < 6} onClick={() => void verify()}>
          Continue
        </Button>
      </div>
    </div>
  );
}
