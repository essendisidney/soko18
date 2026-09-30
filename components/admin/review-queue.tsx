"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import type { QueueItem } from "@/lib/admin/queue";

const title: Record<QueueItem["kind"], string> = {
  case: "Flagged",
  selfie: "Selfie check",
  media: "Photo",
  profile: "Profile",
};

function Img({ src, label }: { src: string | null; label: string }) {
  return (
    <div className="aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-2xl bg-white/5">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <p className="p-2 text-[10px] text-muted">No image</p>
      )}
    </div>
  );
}

export function ReviewQueue() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetch("/api/admin/queue")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { items: QueueItem[] } } | null) => setItems(json?.data?.items ?? []))
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  async function decide(item: QueueItem, action: string) {
    const reason =
      action === "reject" || action === "remove" || action === "ban"
        ? window.prompt("Reason (shown to the member where relevant)") ?? undefined
        : undefined;
    setBusy(item.id);
    setNote(null);
    const res = await fetch("/api/admin/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: item.kind, id: item.id, action, note: reason }),
    });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(null);
    if (!res.ok) {
      setNote(json?.error?.message ?? "Decision failed.");
      return;
    }
    setItems((current) => (current ?? []).filter((row) => row.id !== item.id));
  }

  if (!items) return <p className="mt-8 text-sm text-muted">Loading…</p>;
  if (items.length === 0) return <p className="mt-8 text-sm text-muted">Queue is clear.</p>;

  return (
    <div className="mt-8 max-w-3xl space-y-3">
      {note ? <p className="text-sm text-gold">{note}</p> : null}
      {items.map((item) => (
        <article key={`${item.kind}-${item.id}`} className="rounded-3xl border border-line p-4">
          <p className="text-[11px] tracking-[0.18em] text-gold uppercase">{title[item.kind]}</p>
          <div className="mt-3 flex gap-4">
            {item.kind === "media" ? <Img src={item.url} label="Upload" /> : null}
            {item.kind === "profile" ? <Img src={item.url} label="Main photo" /> : null}
            {item.kind === "selfie" ? (
              <>
                <Img src={item.selfieUrl} label="Selfie" />
                <Img src={item.photoUrl} label="Profile photo" />
              </>
            ) : null}
            <div className="min-w-0 flex-1 text-sm">
              {item.kind === "media" ? <p>{item.profileName}</p> : null}
              {item.kind === "profile" ? (
                <>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-muted">{item.bio || "No bio"}</p>
                  {item.lookingFor ? <p className="mt-1 text-xs text-muted">Looking for: {item.lookingFor}</p> : null}
                </>
              ) : null}
              {item.kind === "selfie" ? (
                <>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-muted">Pose asked: {item.challenge}</p>
                  <p className="mt-1 text-xs text-muted">Same person? Doing the pose? Not a photo of a screen?</p>
                </>
              ) : null}
              {item.kind === "case" ? (
                <>
                  <p className="text-xs text-muted">
                    {item.targetType} · {item.reason}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{item.text || "(no text)"}</p>
                </>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.kind === "case" ? (
              <>
                <Button size="sm" variant="ghost" disabled={busy === item.id} onClick={() => void decide(item, "release")}>
                  Release
                </Button>
                <Button size="sm" variant="ghost" disabled={busy === item.id} onClick={() => void decide(item, "remove")}>
                  Remove
                </Button>
                <Button size="sm" variant="primary" disabled={busy === item.id} onClick={() => void decide(item, "ban")}>
                  Ban account
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="gold" disabled={busy === item.id} onClick={() => void decide(item, "approve")}>
                  Approve
                </Button>
                <Button size="sm" variant="ghost" disabled={busy === item.id} onClick={() => void decide(item, "reject")}>
                  Reject
                </Button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
