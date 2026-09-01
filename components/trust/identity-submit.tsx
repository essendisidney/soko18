"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { readIdentityState, writeIdentityState } from "@/lib/trust/identity-local";
import type { IdentityState } from "@/lib/trust/both-sides";

const lines: Record<IdentityState, string> = {
  none: "Staff review a photo of your ID. Do not type the number here.",
  pending: "In review. Identity evidence stays off public pages.",
  verified: "Identity verified. The other person can see that.",
  rejected: "Rejected. Submit again — still no ID number in the app.",
};

export function IdentitySubmit() {
  const { user, ready, configured } = useAuth();
  const [status, setStatus] = useState<IdentityState>("none");
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setStatus(readIdentityState());
  }, []);

  async function submit() {
    if (configured && ready && !user) {
      setGate(true);
      return;
    }
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/verify/identity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "identity" }),
    });
    setBusy(false);
    if (res.status === 401) {
      setGate(true);
      return;
    }
    if (!res.ok) {
      setNote("Could not queue identity.");
      return;
    }
    writeIdentityState("pending");
    setStatus("pending");
    setNote("Queued for staff. They will ask for a private photo.");
  }

  return (
    <section className="mt-10">
      <h2 className="text-sm text-muted">ID verification</h2>
      <p className="mt-2 text-sm text-muted">{lines[status]}</p>
      <Button
        className="mt-4 w-full"
        variant={status === "pending" || status === "verified" ? "ghost" : "gold"}
        disabled={busy || status === "pending" || status === "verified"}
        onClick={() => void submit()}
      >
        {status === "pending" ? "In review" : status === "verified" ? "Verified" : "Request ID review"}
      </Button>
      {note ? <p className="mt-3 text-xs text-muted">{note}</p> : null}
      {gate ? <AuthGate intent="verify" onClose={() => setGate(false)} /> : null}
    </section>
  );
}
