"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Flag, MoreHorizontal, Send } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { coverPhoto } from "@/lib/media/public";
import { PresenceDot } from "@/components/soko/presence-dot";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import type { SeedProfile } from "@/lib/types";
import type { ThreadMessage } from "@/lib/messages/engine";

const REASONS = ["spam", "harassment", "fake", "underage", "unsafe", "other"] as const;

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
  const cover = coverPhoto(profile);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [canSend, setCanSend] = useState(initialCanSend);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [notice, setNotice] = useState<string | null>(null);
  const [gate, setGate] = useState(false);

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
              },
            ];
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [persisted, conversationId]);

  if (!open || !conversationId) {
    return (
      <div className="pt-16 text-center">
        <p className="font-display text-2xl tracking-tight">Conversation unavailable.</p>
        <p className="mt-3 text-sm text-muted">A thread opens after you both like each other.</p>
        <Link href="/discover" className="mt-8 inline-block text-sm text-gold">
          Discover Nairobi
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-line pb-3">
        <Link href="/matches" aria-label="Back" className="grid size-10 place-items-center">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="relative size-10 overflow-hidden rounded-full">
          {cover ? <Image src={cover} alt="" fill sizes="40px" className="object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {profile.name} {profile.verified ? "✓" : ""}
          </p>
          <PresenceDot presence={profile.presence} className="text-xs" />
        </div>
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
              setReport(true);
              setMenu(false);
            }}
          >
            <Flag className="size-4" /> Report
          </button>
          <button
            type="button"
            className="flex w-full px-2 py-2 text-cream/80"
            onClick={() => {
              void fetch(`/api/conversations/${conversationId}/block`, { method: "POST" }).then(async (res) => {
                if (!res.ok) return;
                setBlocked(true);
                setCanSend(false);
                setMenu(false);
                setNotice("You blocked them. You can’t send.");
              });
            }}
          >
            Block
          </button>
          <p className="px-2 py-2 text-xs text-muted">Media is off until both of you agree.</p>
        </div>
      ) : null}

      {report ? (
        <div className="glass mt-3 rounded-2xl p-3 text-sm">
          <p className="px-2 py-1 text-xs text-muted">Why are you reporting?</p>
          <div className="mt-1 flex flex-wrap gap-2 px-2">
            {REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className="rounded-full border border-line px-3 py-1.5 capitalize"
                onClick={() => {
                  void fetch("/api/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ conversationId, reason }),
                  }).then(async (res) => {
                    if (!res.ok) return;
                    setReport(false);
                    setNotice("Report received.");
                  });
                }}
              >
                {reason}
              </button>
            ))}
          </div>
          <button type="button" className="mt-2 px-2 py-1 text-xs text-muted" onClick={() => setReport(false)}>
            Cancel
          </button>
        </div>
      ) : null}

      {notice ? <p className="mt-3 text-center text-xs text-muted">{notice}</p> : null}
      {blocked ? (
        <p className="mt-3 text-center text-xs text-muted">You can’t message this person.</p>
      ) : null}

      <div className="flex flex-1 flex-col justify-end gap-3 py-6">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted">You both liked each other. Say hello.</p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[75%] rounded-3xl px-4 py-2.5 text-[15px]",
              m.senderId === actorId
                ? "ml-auto bg-gold/20 text-cream"
                : "mr-auto border border-line bg-glass",
            )}
          >
            {m.body}
          </div>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-line pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready || !user) {
            setGate(true);
            return;
          }
          if (!canSend) return;
          const body = text.trim();
          if (!body) return;
          setText("");
          void fetch(`/api/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          }).then(async (res) => {
            const json = (await res.json().catch(() => null)) as
              | { data?: ThreadMessage }
              | { error?: { code: string; message: string } }
              | null;
            if (!res.ok) {
              if (res.status === 403) {
                setCanSend(false);
                setBlocked(true);
                setNotice("You can’t message this person.");
              }
              return;
            }
            if (json && "data" in json && json.data) {
              setMessages((list) => (list.some((row) => row.id === json.data!.id) ? list : [...list, json.data!]));
            }
          });
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={canSend ? "Message..." : "Sending is closed"}
          disabled={!canSend}
          className="h-12 flex-1 rounded-full border border-line bg-glass px-4 text-sm outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!canSend}
          className="grid size-12 place-items-center rounded-full bg-gold text-bg disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
      <AnimatePresence>
        {gate ? <AuthGate intent="message" onClose={() => setGate(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}
