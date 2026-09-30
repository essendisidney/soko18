"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { clearPendingEngage } from "@/lib/auth/pending-engage";
import { safeNextPath } from "@/lib/auth/next-path";
import { guestAuthLine } from "@/lib/auth/guest";
import { useAuth } from "@/lib/auth/use-auth";
import { cityNameBySlug } from "@/lib/geo/kenya";
import { useSnappedCity } from "@/lib/nairobi/use-near-area";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNextPath(search.get("next"));
  const failed = search.get("error") === "auth";
  const { user, ready } = useAuth();
  const configured = isSupabaseConfigured();
  const citySlug = useSnappedCity();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "offline" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!configured) {
      setStatus("offline");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        data: mode === "signup" && name.trim() ? { display_name: name.trim() } : undefined,
      },
    });
    setBusy(false);

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  const heading = mode === "signup" ? "Create account" : "Sign in";
  const altHref = mode === "signup" ? `/login?next=${encodeURIComponent(next)}` : `/signup?next=${encodeURIComponent(next)}`;
  const altLabel = mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-6">
      <Wordmark />
      <p className="mt-10 text-[13px] tracking-[0.22em] text-gold uppercase">{cityNameBySlug(citySlug)}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{heading}</h1>
      <p className="mt-3 text-sm text-muted">{guestAuthLine(citySlug)}</p>

      {status === "sent" ? (
        <p className="mt-8 text-sm leading-relaxed text-cream/90">
          Check your email and tap the link to sign in. It can take a minute — check spam too.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          {mode === "signup" ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              autoComplete="name"
              className="h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
            />
          ) : null}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          />
          <Button className="w-full" variant="gold" disabled={busy}>
            {busy ? "Sending…" : mode === "signup" ? "Create account" : "Email me a sign-in link"}
          </Button>
          <p className="text-center text-xs text-muted">No password. We email you a one-tap link.</p>
        </form>
      )}

      {status === "offline" ? (
        <p className="mt-6 text-sm leading-relaxed text-muted">
          Sign-up isn’t open yet. You can keep browsing as a guest.
        </p>
      ) : null}
      {status === "error" ? <p className="mt-6 text-sm text-danger">{message}</p> : null}
      {failed && status === "idle" ? (
        <p className="mt-6 text-sm text-danger">That sign-in link didn’t work. Try again.</p>
      ) : null}


      {status !== "sent" ? (
        <Link href={altHref} className="mt-6 text-sm text-muted">
          {altLabel}
        </Link>
      ) : null}
      <Link href={status === "sent" ? "/discover" : next} className="mt-6 text-sm text-muted" onClick={() => clearPendingEngage()}>
        {status === "sent" ? "Keep browsing while you wait" : "Not now, keep browsing"}
      </Link>
      <p className="mt-8 text-xs leading-relaxed text-muted">
        18+ only.{" "}
        <Link href="/terms" className="text-cream/70">
          Terms
        </Link>
        {" · "}
        <Link href="/privacy" className="text-cream/70">
          Privacy
        </Link>
        {" · "}
        <Link href="/safety" className="text-cream/70">
          Safety
        </Link>
      </p>
    </main>
  );
}
