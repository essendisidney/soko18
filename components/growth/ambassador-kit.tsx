"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Printer } from "lucide-react";
import { raceShareText, raceUrl, whatsappHref, type RaceRow } from "@/lib/campus/race";
import { inviteMessage } from "@/lib/growth/referral";
import { questionOfTheWeek } from "@/lib/growth/question";
import { useAuth } from "@/lib/auth/use-auth";

/** Everything an ambassador needs on one page: links, ready messages and the rules. */
export function AmbassadorKit({ race, origin }: { race: RaceRow[]; origin: string }) {
  const { user } = useAuth();
  const [slug, setSlug] = useState(race[0]?.slug ?? "");
  const [code, setCode] = useState<string | null>(null);
  const row = race.find((r) => r.slug === slug);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/invites", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { code: string | null } } | null) => setCode(json?.data?.code ?? null))
      .catch(() => {});
    void fetch("/api/campus", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { mine?: { slug: string } | null } } | null) => {
        const mine = json?.data?.mine?.slug;
        if (mine) setSlug(mine);
      })
      .catch(() => {});
  }, [user]);

  const q = questionOfTheWeek();
  const messages = [
    row ? { label: "For your campus group", text: raceShareText(race, row.slug, origin) } : null,
    code ? { label: "For a friend (your invite link)", text: inviteMessage(origin, code) } : null,
    { label: "For your Status (question of the week)", text: `${q} 👀 Reply with yours. ${origin}/q` },
  ].filter((m): m is { label: string; text: string } => Boolean(m));

  return (
    <div className="pb-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Ambassador kit</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Help open your campus</h1>
      <p className="mt-2 text-sm text-muted">Links, ready messages and a poster. Every number in them is real.</p>

      {race.length ? (
        <label className="mt-6 block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Campus</span>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          >
            {race.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <section className="mt-6 space-y-2">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Links</h2>
        {row ? <KitLink label={`${row.shortName} race`} href={raceUrl(origin, row.slug)} /> : null}
        <KitLink label="Question of the week (street interviews)" href={`${origin}/q`} />
        {row ? (
          <Link
            href={`/poster/${row.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm"
          >
            <Printer className="size-4 text-gold" aria-hidden />
            <span className="flex-1">Printable {row.shortName} poster (A4, QR code)</span>
          </Link>
        ) : null}
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Ready messages</h2>
        {messages.map((m) => (
          <div key={m.label} className="rounded-2xl border border-line p-4">
            <p className="text-xs text-muted">{m.label}</p>
            <p className="mt-2 text-sm text-cream/90">{m.text}</p>
            <div className="mt-3 flex gap-2">
              <a
                href={whatsappHref(m.text)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-4 text-xs font-medium text-[#062b14]"
              >
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
              <CopyButton text={m.text} />
            </div>
          </div>
        ))}
        {!user ? (
          <p className="text-xs text-muted">
            <Link href="/login?next=/kit" className="text-gold">
              Sign in
            </Link>{" "}
            to add your own invite link. You get 7 days of Gold for each friend who goes live.
          </p>
        ) : null}
      </section>

      <section className="mt-8 rounded-3xl border border-line p-5 text-sm">
        <h2 className="font-display text-xl">The rules</h2>
        <ul className="mt-3 space-y-2 text-cream/85">
          <li>• Only post in groups you’re in, or where the admin says yes. No spamming.</li>
          <li>• Universities only. Never near schools, and never to anyone under 18.</li>
          <li>• Never make up numbers or fake profiles. Share the real race.</li>
          <li>• Kutana is for meeting people. Never promote “sponsors” or anything paid.</li>
          <li>• Posters only where posters are allowed.</li>
        </ul>
      </section>
    </div>
  );
}

function KitLink({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        <span className="block truncate text-xs text-muted">{href.replace(/^https?:\/\//, "")}</span>
      </span>
      <CopyButton text={href} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard.writeText(text).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1500);
          },
          () => setDone(false),
        )
      }
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-cream/85"
    >
      {done ? <Check className="size-3.5 text-gold" /> : <Copy className="size-3.5" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}
