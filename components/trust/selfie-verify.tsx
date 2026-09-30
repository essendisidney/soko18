"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/soko/button";
import { resizeImage } from "@/lib/media/resize";
import { createClient } from "@/lib/supabase/client";
import type { SelfieStatus } from "@/lib/trust/selfie";

/**
 * Photo verification: we show a random pose, the member takes a live selfie doing it,
 * staff compare it with their profile photos. Approved members get the blue check.
 */
export function SelfieVerify({ userId }: { userId: string }) {
  const [state, setState] = useState<SelfieStatus | null>(null);
  const [check, setCheck] = useState<{ id: string; challenge: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/verify/selfie")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: SelfieStatus } | null) => setState(json?.data ?? { status: "none" }))
      .catch(() => setState({ status: "none" }));
  }, []);

  async function begin() {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/verify/selfie", { method: "POST" });
    const json = (await res.json().catch(() => null)) as
      | { data?: { id: string; challenge: string }; error?: { message: string } }
      | null;
    setBusy(false);
    if (!res.ok || !json?.data) {
      setNote(json?.error?.message ?? "Could not start.");
      return;
    }
    setCheck(json.data);
  }

  async function onFile(file: File | undefined) {
    if (!file || !check) return;
    setBusy(true);
    const blob = await resizeImage(file, 1080);
    const path = `${userId}/${check.id}.jpg`;
    const { error } = await createClient()
      .storage.from("verification")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) {
      setBusy(false);
      setNote("Upload failed. Try again.");
      return;
    }
    const res = await fetch("/api/verify/selfie/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: check.id, path }),
    });
    setBusy(false);
    if (!res.ok) {
      setNote("Could not submit. Try again.");
      return;
    }
    setCheck(null);
    setState({ status: "pending", submitted: true });
  }

  if (!state) return null;

  return (
    <section className="mt-10 rounded-3xl border border-line p-5">
      <h2 className="font-display text-xl">Get verified</h2>
      {state.status === "verified" ? (
        <p className="mt-2 text-sm text-gold">You’re verified. Your blue check is showing.</p>
      ) : state.status === "pending" && state.submitted ? (
        <p className="mt-2 text-sm text-muted">Thanks. We’re checking your selfie against your photos, usually within a day.</p>
      ) : check ? (
        <>
          <p className="mt-2 text-sm text-muted">Take a selfie now doing this pose:</p>
          <p className="mt-3 text-lg">{check.challenge}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button className="mt-4 w-full" variant="gold" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading…" : "Open camera"}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            {state.status === "rejected"
              ? state.note ?? "Your last selfie didn’t pass. Try again in good light."
              : "Verified profiles get more matches. Take one selfie doing a pose we show you. Only our review team sees it."}
          </p>
          <Button className="mt-4 w-full" variant="gold" disabled={busy} onClick={() => void begin()}>
            Verify with a selfie
          </Button>
        </>
      )}
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
