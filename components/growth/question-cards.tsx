"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Share2 } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { PromptShareSheet } from "@/components/growth/prompt-share";

/**
 * Question of the week, and flash cards for street interviews: hold the phone up, ask, tap Next.
 * Public, no sign-in, nothing about any member.
 */
export function QuestionCards({ deck }: { deck: string[] }) {
  const [i, setI] = useState(0);
  const [sharing, setSharing] = useState(false);
  const q = deck[i % deck.length];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Wordmark size="sm" />
      <p className="mt-10 text-[11px] tracking-[0.22em] text-gold uppercase">
        {i === 0 ? "Question of the week" : `Question ${i + 1} of ${deck.length}`}
      </p>
      <h1 aria-live="polite" className="mt-4 font-display text-[40px] leading-[1.05] tracking-tight text-cream">
        {q}
      </h1>
      <p className="mt-4 text-sm text-muted">Ask a friend. Ask a stranger. Post their answer.</p>

      <div className="mt-auto space-y-3 pt-10">
        <Button variant="ghost" className="w-full" onClick={() => setI((n) => (n + 1) % deck.length)}>
          Next question <ArrowRight className="ml-1 size-4" />
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setSharing(true)}>
          <Share2 className="mr-2 size-4" /> Share as a Status image
        </Button>
        <Link href="/" className="block">
          <Button variant="gold" className="w-full">
            Answer it on Kutana
          </Button>
        </Link>
        <p className="text-center text-[11px] text-muted">Kutana is for adults 18+.</p>
      </div>

      {sharing ? (
        <PromptShareSheet
          title="Share the question"
          prompt={{ q, a: "" }}
          kicker={i === 0 ? "Question of the week" : "Your turn"}
          link={`${window.location.origin}/q`}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </main>
  );
}
