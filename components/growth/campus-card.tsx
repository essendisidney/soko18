"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, GraduationCap, MessageCircle } from "lucide-react";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";
import { writeCampusDeck } from "@/lib/campus/deck";
import { campusProgress, type CampusBoardRow, type MyCampus } from "@/lib/campus/shared";

type Overview = { mine: MyCampus | null; board: CampusBoardRow[] };

async function load(): Promise<Overview | null> {
  const res = await fetch("/api/campus", { cache: "no-store" }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;
  return (json?.data as Overview | undefined) ?? null;
}

async function post(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;
  return {
    ok: Boolean(res?.ok),
    code: (json?.error?.code as string | undefined) ?? null,
    message: (json?.error?.message as string | undefined) ?? null,
    name: (json?.data?.name as string | undefined) ?? null,
  };
}

function shareText(origin: string, campus: string) {
  return `${campus} is opening on Kutana — dating with verified students only. Verify with your student email: ${origin}/campus`;
}

export function CampusCard() {
  const { user, ready, configured } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => load().then(setData), []);

  async function setPrivacy(change: Partial<Pick<MyCampus, "showOnProfile" | "hideFromCampus">>) {
    setData((d) => (d?.mine ? { ...d, mine: { ...d.mine, ...change } } : d));
    await fetch("/api/campus", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(change),
    }).catch(() => null);
    if (change.hideFromCampus) writeCampusDeck(null);
    void refresh();
  }

  useEffect(() => {
    if (!ready) return;
    void refresh();
  }, [ready, user, refresh]);

  async function run(action: () => Promise<{ ok: boolean; message: string | null }>, onOk?: () => void) {
    setBusy(true);
    setNote(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setNote(result.message ?? "Something went wrong. Try again.");
      return;
    }
    onOk?.();
  }

  const mine = data?.mine ?? null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <>
      {!configured ? (
        <p className="mt-8 text-sm text-muted">Campus opens when sign-up opens.</p>
      ) : ready && !user ? (
        <section className="mt-8 rounded-3xl border border-line p-5">
          <p className="font-display text-xl">Verify your campus</p>
          <p className="mt-1 text-sm text-muted">Sign in, then confirm your university email. It takes a minute.</p>
          <Link href="/login?next=/campus" className="mt-4 block">
            <Button className="w-full" variant="gold">
              Sign in
            </Button>
          </Link>
        </section>
      ) : !data ? (
        <div className="mt-8 h-56 animate-pulse rounded-3xl border border-line bg-glass" />
      ) : mine ? (
        <section className="mt-8 rounded-3xl border border-gold/50 p-5">
          <p className="inline-flex items-center gap-1.5 text-sm text-gold">
            <CheckCircle2 className="size-4" /> Verified at {mine.shortName}
          </p>
          {mine.status === "live" ? (
            <>
              <p className="mt-3 font-display text-2xl">{mine.shortName} is open</p>
              <p className="mt-1 text-sm text-muted">{mine.joined} verified students. Your campus deck shows only them.</p>
              {mine.hideFromCampus ? (
                <p className="mt-4 rounded-2xl border border-line px-4 py-3 text-sm text-muted">
                  You’re hidden from {mine.shortName}, so your campus deck is off. Turn hiding off below to use it.
                </p>
              ) : (
                <Button
                  className="mt-4 w-full"
                  variant="gold"
                  onClick={() => {
                    writeCampusDeck(mine.slug);
                    router.push("/discover");
                  }}
                >
                  Open the {mine.shortName} deck
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="mt-3 text-sm">
                <span className="font-display text-2xl">{mine.joined}</span>
                <span className="text-muted"> of {mine.target} students in. {mine.shortName} opens at {mine.target}.</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gold" style={{ width: `${campusProgress(mine.joined, mine.target)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">Until then you’ll see everyone near you, and your badge shows on your card.</p>
            </>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText(origin, mine.shortName))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block"
          >
            <Button className="w-full" variant={mine.status === "live" ? "ghost" : "gold"}>
              <MessageCircle className="mr-2 size-4" /> Tell {mine.shortName} on WhatsApp
            </Button>
          </a>
          <Link href="/invite" className="mt-2 block text-center text-xs text-muted">
            Friends who join with your invite link earn you 7 days of Gold
          </Link>

          <label className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            <span>
              Show {mine.shortName} on my profile
              <span className="block text-xs text-muted">Off: you keep the campus deck, but your card has no badge.</span>
            </span>
            <input
              type="checkbox"
              className="size-5 accent-[var(--color-gold,#d4b56a)]"
              checked={mine.showOnProfile}
              onChange={(event) => void setPrivacy({ showOnProfile: event.target.checked })}
            />
          </label>
          <label className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span>
              Hide me from {mine.shortName}
              <span className="block text-xs text-muted">
                Other verified {mine.shortName} students won’t see you, unless you’ve liked them. Your campus deck turns off.
              </span>
            </span>
            <input
              type="checkbox"
              className="size-5 accent-[var(--color-gold,#d4b56a)]"
              checked={mine.hideFromCampus}
              onChange={(event) => void setPrivacy({ hideFromCampus: event.target.checked })}
            />
          </label>
          <button
            type="button"
            className="mt-4 text-xs text-muted underline"
            onClick={async () => {
              if (!window.confirm(`Remove your ${mine.shortName} verification?`)) return;
              await fetch("/api/campus", { method: "DELETE" }).catch(() => null);
              writeCampusDeck(null);
              void refresh();
            }}
          >
            Remove my campus
          </button>
        </section>
      ) : (
        <section className="mt-8 rounded-3xl border border-line p-5">
          <p className="font-display text-xl">Verify your campus</p>
          <p className="mt-1 text-sm text-muted">
            Use your university email. We never show it — we keep a scrambled copy so one student email verifies one account.
          </p>
          <Button
            className="mt-4 w-full"
            variant="gold"
            disabled={busy}
            onClick={() => run(() => post("/api/campus/login"), () => void refresh())}
          >
            Use my sign-in email
          </Button>
          {step === "email" ? (
            <form
              className="mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  () => post("/api/campus/code", { email }),
                  () => {
                    setSentTo(email.trim());
                    setStep("code");
                  },
                );
              }}
            >
              <label htmlFor="campus-email" className="text-[11px] tracking-[0.18em] text-muted uppercase">
                Or send a code to my student email
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="campus-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@students.uonbi.ac.ke"
                  className="h-12 min-w-0 flex-1 rounded-full border border-line bg-glass px-4 text-sm outline-none"
                />
                <Button type="submit" variant="ghost" disabled={busy || !email.includes("@")}>
                  Send
                </Button>
              </div>
            </form>
          ) : (
            <form
              className="mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => post("/api/campus/confirm", { code }), () => void refresh());
              }}
            >
              <label htmlFor="campus-code" className="text-[11px] tracking-[0.18em] text-muted uppercase">
                Code sent to {sentTo}
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="campus-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="h-12 min-w-0 flex-1 rounded-full border border-line bg-glass px-4 text-sm tracking-[0.3em] outline-none"
                />
                <Button type="submit" variant="ghost" disabled={busy || code.length !== 6}>
                  Verify
                </Button>
              </div>
              <button
                type="button"
                className="mt-2 text-xs text-muted underline"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setNote(null);
                }}
              >
                Use a different email
              </button>
            </form>
          )}
          {note ? (
            <p role="status" className="mt-3 text-xs text-muted">
              {note}
            </p>
          ) : null}
          <p className="mt-4 text-xs text-muted">Campus is for students 18 and over.</p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Campus race</h2>
        {data && data.board.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {data.board.map((row) => (
              <li key={row.slug} className="rounded-3xl border border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="inline-flex min-w-0 items-center gap-2 font-medium">
                    <GraduationCap className="size-4 shrink-0 text-gold" aria-hidden />
                    <span className="truncate">{row.shortName}</span>
                    <span className="truncate text-xs font-normal text-muted">{row.town}</span>
                  </p>
                  <p className="shrink-0 text-xs text-muted">
                    {row.status === "live"
                      ? row.daysToOpen != null
                        ? `Open · took ${row.daysToOpen} day${row.daysToOpen === 1 ? "" : "s"}`
                        : "Open"
                      : `${row.joined} / ${row.target}`}
                  </p>
                </div>
                {row.status !== "live" ? (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${campusProgress(row.joined, row.target)}%` }} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">{data ? "No campuses yet." : "Loading…"}</p>
        )}
        <p className="mt-3 text-xs text-muted">
          Counts are real verified students. Don’t see your school? Email support and we’ll add it.
        </p>
      </section>
    </>
  );
}
