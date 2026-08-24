"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, Flag, MoreHorizontal, Send } from "lucide-react";
import { THREADS, getProfile } from "@/lib/data/seed";
import { PresenceDot } from "@/components/soko/presence-dot";
import { cn } from "@/lib/utils";

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const profile = getProfile(id);
  const existing = THREADS.find((t) => t.profileSlug === id);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(existing?.messages ?? []);
  const [menu, setMenu] = useState(false);

  if (!profile) {
    return <p className="pt-20 text-center text-muted">Conversation unavailable.</p>;
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-line pb-3">
        <Link href="/matches" aria-label="Back" className="grid size-10 place-items-center">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="relative size-10 overflow-hidden rounded-full">
          <Image src={profile.photos[0]} alt="" fill className="object-cover" />
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
          <button type="button" className="flex w-full items-center gap-2 px-2 py-2 text-danger">
            <Flag className="size-4" /> Report
          </button>
          <button type="button" className="flex w-full px-2 py-2 text-cream/80">
            Block
          </button>
          <p className="px-2 py-2 text-xs text-muted">Safety controls stay in the thread. Media is off until both of you agree.</p>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col justify-end gap-3 py-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[75%] rounded-3xl px-4 py-2.5 text-[15px]",
              m.from === "me"
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
          if (!text.trim()) return;
          setMessages((list) => [
            ...list,
            { id: crypto.randomUUID(), from: "me", body: text.trim(), at: "now" },
          ]);
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="h-12 flex-1 rounded-full border border-line bg-glass px-4 text-sm outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          className="grid size-12 place-items-center rounded-full bg-gold text-bg"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
