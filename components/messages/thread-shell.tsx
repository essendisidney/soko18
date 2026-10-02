"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Flag, MoreHorizontal, Send } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { coverPhoto } from "@/lib/media/public";
import { PresenceDot } from "@/components/soko/presence-dot";
import { Button } from "@/components/soko/button";
import { AuthGate, type AuthIntent } from "@/components/auth/auth-gate";
import { ReportReasons } from "@/components/safety/report-reasons";
import { writeReportFlag } from "@/lib/reports/local";
import { writeDiscoverAction } from "@/lib/discovery/actions";
import { goBackOr } from "@/components/profile/profile-back";
import { useAuth } from "@/lib/auth/use-auth";
import { writeBlock } from "@/lib/blocks/local";
import { writeFavorite } from "@/lib/favorites/local";
import { markMatchSeen, writeMatchWaiting } from "@/lib/matches/waiting";
import { postBlock, postEmergency, postFavorite, readDeviceLocation } from "@/lib/safety/client";
import { readEmergencyContact } from "@/lib/safety/emergency";
import { cn } from "@/lib/utils";
import { sokoVerified } from "@/lib/trust/verified";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import type { SeedProfile } from "@/lib/types";
import { lastOwnReceipt, markThreadRead, type ThreadMessage } from "@/lib/messages/engine";

/** First-message ideas, built from what they wrote so the opener isn't just "hi". */
function icebreakers(profile: SeedProfile): string[] {
  const ideas: string[] = [];
  const prompt = profile.prompts?.find((p) => p.a?.trim());
  if (prompt) ideas.push(`Okay, “${prompt.a.trim().slice(0, 40)}” — tell me more 😄`);
  if (profile.area) ideas.push(`What’s your favourite spot in ${profile.area}?`);
  ideas.push(`Hey ${profile.name} 👋 how’s your week going?`);
  ideas.push("Nyama choma or pizza — choose wisely.");
  return ideas.slice(0, 3);
}

export function ThreadShell({
  profile,
  open,
  conversationId,
  initialMessages,
  canSend: initialCanSend,
  blocked: initialBlocked,
  persisted,
  actorId,
}: {
  profile: SeedProfile;
  open: boolean;
  conversationId: string | null;
  initialMessages: ThreadMessage[];
  canSend: boolean;
  blocked: boolean;
  persisted: boolean;
  actorId: string | null;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const cover = coverPhoto(profile);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [canSend, setCanSend] = useState(initialCanSend);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [notice, setNotice] = useState<string | null>(null);
  const [gate, setGate] = useState<AuthIntent | null>(null);
  const [panicNote, setPanicNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    markMatchSeen(profile.id);
  }, [open, profile.id]);

  useEffect(() => {
    if (!open || !conversationId || !actorId) return;
    void fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).then((res) => {
      if (!res.ok) return;
      setMessages((list) => markThreadRead(list, conversationId, actorId, new Date().toISOString()).messages);
    });
  }, [open, conversationId, actorId]);

  useEffect(() => {
    if (!persisted || !conversationId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            body: string | null;
            created_at: string;
            read_at: string | null;
          };
          setMessages((list) => {
            if (list.some((item) => item.id === row.id)) return list;
            return [
              ...list,
              {
                id: row.id,
                conversationId: row.conversation_id,
                senderId: row.sender_id,
                body: row.body ?? "",
                createdAt: row.created_at,
                readAt: row.read_at,
              },
            ];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; read_at: string | null };
          setMessages((list) =>
            list.map((item) => (item.id === row.id ? { ...item, readAt: row.read_at } : item)),
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [persisted, conversationId]);

  if (!open || !conversationId) {
    return (
      <div className="mt-10">
        <h1 className="font-display text-[34px] tracking-tight">No thread yet</h1>
        <p className="mt-2 text-sm text-muted">A like stays quiet until they like you back.</p>
        <Link href="/discover" className="mt-8 inline-block w-full">
          <Button className="w-full" variant="gold">
            Discover
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-line pb-3">
        <button
          type="button"
          aria-label="Back"
          className="grid size-10 place-items-center"
          onClick={() => goBackOr(router, "/matches")}
        >
          <ArrowLeft className="size-5" />
        </button>
        <Link href={`/profile/${profile.slug}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`Open ${profile.name}’s profile`}>
          <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-white/5">
            {cover ? <Image src={cover} alt="" fill sizes="40px" className="object-cover" unoptimized={cover.startsWith("http")} /> : null}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">
              {profile.name} {sokoVerified(profile) ? "✓" : ""}
            </span>
            <PresenceDot presence={profile.presence} className="text-xs" />
          </span>
        </Link>
        <button type="button" className="grid size-10 place-items-center" onClick={() => setMenu((v) => !v)}>
          <MoreHorizontal className="size-5" />
        </button>
      </header>

      {menu ? (
        <div className="glass mt-3 rounded-2xl p-3 text-sm">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-2 text-danger"
            onClick={() => {
              if (!ready) return;
              if (!user) {
                setGate("report");
                return;
              }
              setReport(true);
              setMenu(false);
            }}
          >
            <Flag className="size-4" />             Report
          </button>
          <button
            type="button"
            className="flex w-full px-2 py-2 text-danger"
            onClick={() => {
              setMenu(false);
              const contact = readEmergencyContact();
              if (!contact) {
                router.push("/safety#panic");
                return;
              }
              if (!ready || !user) {
                setGate("panic");
                return;
              }
              void (async () => {
                const loc = await readDeviceLocation();
                if (!loc) {
                  setPanicNote("Location is required for panic.");
                  return;
                }
                const res = await postEmergency("panic", {
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude,
                  name: contact.name,
                  phone: contact.phone,
                });
                if (res.status === 401) {
                  setGate("panic");
                  return;
                }
                setPanicNote(res.ok ? (res.delivered ? "Alert sent to your trusted contact." : "Alert recorded.") : "Could not send the alert.");
              })();
            }}
          >
            Panic
          </button>
          <button
            type="button"
            className="flex w-full px-2 py-2 text-cream/80"
            onClick={() => {
              writeBlock(profile.id, true);
              writeFavorite(profile.id, false);
              writeMatchWaiting(profile.id, false);
              if (user) {
                void postBlock(profile.id, true);
                void postFavorite(profile.id, false);
              }
              setBlocked(true);
              setCanSend(false);
              setMenu(false);
              setNotice("Blocked. Hidden from Discover.");
              if (conversationId) {
                void fetch(`/api/conversations/${conversationId}/block`, { method: "POST" }).then(() => {
                  router.refresh();
                });
              } else {
                router.refresh();
              }
            }}
          >
            Block
          </button>
        </div>
      ) : null}

      {report ? (
        <ReportReasons
          onPick={(reason) => {
            void fetch("/api/reports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId, reason }),
            }).then(async (res) => {
              if (res.status === 401) {
                setGate("report");
                return;
              }
              if (!res.ok) return;
              writeReportFlag(profile.id, user?.id ?? "local", reason);
              writeDiscoverAction({ profileId: profile.id, kind: "pass", at: Date.now() });
              setReport(false);
              setNotice("Report received. Hidden from Discover.");
            });
          }}
          onCancel={() => setReport(false)}
        />
      ) : null}

      {notice ? <p className="mt-3 text-center text-xs text-muted">{notice}</p> : null}
      {panicNote ? <p className="mt-3 text-center text-xs text-muted">{panicNote}</p> : null}
      {blocked ? (
        <p className="mt-3 text-center text-xs text-muted">You can’t message this person.</p>
      ) : null}

      <div className="flex flex-1 flex-col justify-end gap-3 py-6">
        {messages.length === 0 ? (
          <div className="text-center">
            <p className="font-display text-2xl">You matched with {profile.name} 🎉</p>
            <p className="mt-1 text-sm text-muted">Be the one who says hi first. Tap one to start:</p>
            <div className="mt-4 flex flex-col items-center gap-2">
              {icebreakers(profile).map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setText(idea)}
                  className="max-w-[90%] rounded-full border border-gold/50 bg-gold/10 px-4 py-2 text-sm text-cream active:scale-[0.98]"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((m, i) => {
          const lastOwnIndex = messages.reduce(
            (acc, row, idx) => (row.senderId === actorId ? idx : acc),
            -1,
          );
          const lastOwn = lastOwnReceipt(messages, conversationId, actorId ?? "");
          const isLastOwn = i === lastOwnIndex && m.senderId === actorId;
          return (
          <div
            key={m.id}
            className={cn(
              "max-w-[78%] px-4 py-2.5 text-[15px] leading-snug shadow-[0_2px_10px_rgba(0,0,0,0.25)]",
              m.senderId === actorId
                ? "ml-auto rounded-[22px] rounded-br-md bg-gold text-bg"
                : "mr-auto rounded-[22px] rounded-bl-md bg-bg-elevated text-cream",
            )}
          >
            {m.body}
            {isLastOwn && lastOwn !== "none" ? (
              <p className="mt-1 text-right text-[10px] tracking-wide text-bg/60">{lastOwn === "read" ? "Read" : "Sent"}</p>
            ) : null}
          </div>
          );
        })}
      </div>


      {blocked ? (
        <Link href="/discover" className="mb-3 block">
          <Button className="w-full" variant="ghost">
            Back to Discover
          </Button>
        </Link>
      ) : null}

      <form
        className="flex items-center gap-2 border-t border-line pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready || !user) {
            setGate("message");
            return;
          }
          if (!canSend || sending) return;
          const body = text.trim();
          if (!body) return;
          setText("");
          setSending(true);
          setNotice(null);
          void fetch(`/api/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          }).then(async (res) => {
            const json = (await res.json().catch(() => null)) as
              | { data?: ThreadMessage }
              | { error?: { code: string; message: string } }
              | null;
            setSending(false);
            if (!res.ok) {
              if (res.status === 403) {
                setCanSend(false);
                setBlocked(true);
                setNotice("You can’t message this person.");
                return;
              }
              // Give the words back so nothing typed is lost.
              setText(body);
              setNotice(
                json && "error" in json && json.error?.message ? json.error.message : "Not sent. Check your connection and tap send again.",
              );
              return;
            }
            if (json && "data" in json && json.data) {
              setMessages((list) => (list.some((row) => row.id === json.data!.id) ? list : [...list, json.data!]));
            }
          })
          .catch(() => {
            setSending(false);
            setText(body);
            setNotice("Not sent. Check your connection and tap send again.");
          });
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={canSend ? `Message ${profile.name}…` : "Sending is closed"}
          disabled={!canSend}
          enterKeyHint="send"
          className="h-12 flex-1 rounded-full border border-line bg-glass px-4 text-sm outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!canSend || sending || !text.trim()}
          className="grid size-12 place-items-center rounded-full bg-gold text-bg disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
      <AnimatePresence>
        {gate ? <AuthGate intent={gate} onClose={() => setGate(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
