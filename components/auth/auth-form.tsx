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

/** Turn on once the Google provider is set up in Supabase. */
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";

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
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showEmail, setShowEmail] = useState(!GOOGLE_ENABLED);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function onGoogle() {
    if (!configured) {
      setStatus("offline");
      return;
    }
    setGoogleBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setGoogleBusy(false);
      setStatus("error");
      setMessage("Google sign-in isn’t available right now. Use your email instead.");
      setShowEmail(true);
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return;
    setVerifying(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setVerifying(false);
    if (error) {
      setMessage("That code didn’t work. Check the latest email, or send a new one.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

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
        <form onSubmit={onVerify} className="mt-8 space-y-3">
          <p className="text-sm leading-relaxed text-cream/90">
            We sent an email to <span className="text-gold">{email.trim()}</span>. Enter the 6-digit code from it, or tap the
            link in the email. Check spam too.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            aria-label="Sign-in code"
            className="h-14 w-full rounded-full border border-line bg-glass px-4 text-center font-display text-2xl tracking-[0.5em] outline-none focus:border-gold"
          />
          <Button className="w-full" variant="gold" disabled={verifying || code.length < 6}>
            {verifying ? "Checking…" : "Sign in"}
          </Button>
          {message ? <p className="text-sm text-danger">{message}</p> : null}
          <button
            type="button"
            className="w-full text-center text-xs text-muted"
            onClick={() => {
              setStatus("idle");
              setCode("");
              setMessage("");
            }}
          >
            Use a different email or send again
          </button>
        </form>
      ) : (
        <>
        {GOOGLE_ENABLED ? (
          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => void onGoogle()}
              disabled={googleBusy}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-medium text-[#1f1f1f] transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <GoogleMark />
              {googleBusy ? "Opening Google…" : "Continue with Google"}
            </button>
            {!showEmail ? (
              <button type="button" onClick={() => setShowEmail(true)} className="w-full py-2 text-center text-sm text-muted">
                Use email instead
              </button>
            ) : (
              <div className="flex items-center gap-3 pt-2 text-xs text-muted">
                <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
              </div>
            )}
          </div>
        ) : null}
        {showEmail ? (
        <form onSubmit={onSubmit} className={GOOGLE_ENABLED ? "mt-3 space-y-3" : "mt-8 space-y-3"}>
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
            {busy ? "Sending…" : mode === "signup" ? "Create account" : "Email me a sign-in code"}
          </Button>
          <p className="text-center text-xs text-muted">No password. We email you a code and a one-tap link.</p>
        </form>
        ) : null}
        </>
      )}

      {status === "offline" ? (
        <p className="mt-6 text-sm leading-relaxed text-muted">
          Sign-up isn’t open yet. You can keep browsing as a guest.
        </p>
      ) : null}
      {status === "error" && message ? <p className="mt-6 text-sm text-danger">{message}</p> : null}
      {failed && status === "idle" ? (
        <p className="mt-6 text-sm text-danger">That link opened in a different browser, so it couldn’t finish. Send a new code and type it in here instead.</p>
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

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
