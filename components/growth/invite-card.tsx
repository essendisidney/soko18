"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/soko/button";
import { FoundingBadge } from "@/components/brand/founding-badge";
import { useAuth } from "@/lib/auth/use-auth";
import { clearPendingInvite, inviteUrl, pendingInvite, whatsappInviteUrl } from "@/lib/growth/referral";
import type { InviteSummary } from "@/app/api/invites/route";

async function fetchSummary(): Promise<InviteSummary | null> {
  const res = await fetch("/api/invites", { cache: "no-store" }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;
  return json?.data ?? null;
}

async function claim(code: string) {
  const res = await fetch("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, message: (json?.error?.message as string | undefined) ?? null };
}

export function InviteCard() {
  const { user, ready, configured } = useAuth();
  const [summary, setSummary] = useState<InviteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let alive = true;
    const refresh = () =>
      fetchSummary().then((data) => {
        if (!alive) return;
        setSummary(data);
        setLoading(false);
      });
    void refresh();
    // A code saved from an invite link before sign-up: use it now.
    const saved = pendingInvite();
    if (saved) {
      void claim(saved).then(() => {
        clearPendingInvite();
        void refresh();
      });
    }
    return () => {
      alive = false;
    };
  }, [ready, user]);

  if (!configured) {
    return <p className="mt-8 text-sm text-muted">Invites open when sign-up opens.</p>;
  }

  if (ready && !user) {
    return (
      <section className="mt-8 rounded-3xl border border-line p-5">
        <p className="font-display text-xl">Get your invite link</p>
        <p className="mt-1 text-sm text-muted">Sign in to get a link you can send on WhatsApp.</p>
        <Link href="/login?next=/invite" className="mt-4 block">
          <Button className="w-full" variant="gold">
            Sign in
          </Button>
        </Link>
      </section>
    );
  }

  if (loading || !summary?.code) {
    return <div className="mt-8 h-56 animate-pulse rounded-3xl border border-line bg-glass" />;
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = inviteUrl(origin, summary.code);
  const rewardsUsed = Math.round(summary.goldDaysEarned / Math.max(1, summary.rewardDays));
  const left = Math.max(0, summary.rewardCap - rewardsUsed);

  return (
    <>
      <section className="mt-8 rounded-3xl border border-gold/50 p-5">
        {summary.founding ? <FoundingBadge /> : null}
        <p className="mt-3 text-[11px] tracking-[0.18em] text-muted uppercase">Your code</p>
        <p className="mt-1 font-display text-3xl tracking-[0.2em] text-gold">{summary.code}</p>
        <a href={whatsappInviteUrl(origin, summary.code)} target="_blank" rel="noopener noreferrer" className="mt-4 block">
          <Button className="w-full" variant="gold">
            <MessageCircle className="size-4" /> Invite on WhatsApp
          </Button>
        </a>
        <Button
          className="mt-3 w-full"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(link).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          <Copy className="size-4" /> {copied ? "Link copied" : "Copy link"}
        </Button>
      </section>

      <section className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat value={summary.invited} label="Joined" />
        <Stat value={summary.approved} label="Live" />
        <Stat value={summary.goldDaysEarned} label="Gold days" gold />
      </section>

      <section className="mt-6 space-y-3 text-sm">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">How it works</h2>
        <Step n={1} text="A friend joins with your link and makes a profile." />
        <Step n={2} text={`When their profile goes live, you get ${summary.rewardDays} days of Gold.`} />
        <Step n={3} text={`They get ${summary.friendSuperLikes} free Super Likes to start.`} />
        <p className="text-xs text-muted">
          {left > 0
            ? `You can earn Gold for ${left} more ${left === 1 ? "friend" : "friends"}. Real people only — fake accounts are removed.`
            : "You’ve earned the maximum free Gold. Thank you for building Kutana."}
        </p>
      </section>

      {!summary.invitedBy ? (
        <section className="mt-8">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Got a friend’s code?</h2>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
              aria-label="Friend’s invite code"
              className="h-12 min-w-0 flex-1 rounded-full border border-line bg-glass px-4 text-sm tracking-[0.2em] outline-none"
            />
            <Button
              variant="ghost"
              disabled={code.trim().length < 4}
              onClick={async () => {
                const result = await claim(code);
                setNote(result.ok ? "Done. Your welcome gift unlocks when your profile goes live." : result.message ?? "Couldn’t use that code.");
                if (result.ok) setSummary(await fetchSummary());
              }}
            >
              Use
            </Button>
          </div>
          {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
        </section>
      ) : null}
    </>
  );
}

function Stat({ value, label, gold }: { value: number; label: string; gold?: boolean }) {
  return (
    <div className="rounded-2xl border border-line py-3">
      <p className={gold ? "font-display text-2xl text-gold" : "font-display text-2xl"}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gold/60 text-xs text-gold">
        {n}
      </span>
      <p className="text-cream/90">{text}</p>
    </div>
  );
}
