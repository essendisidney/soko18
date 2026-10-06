"use client";

import { useState } from "react";
import { Dices, Plus, Repeat2, X } from "lucide-react";
import { Chip } from "@/components/soko/chip";
import {
  MAX_PROMPT_ANSWER,
  MAX_PROMPTS,
  PROMPT_CATEGORIES,
  promptHint,
  surprisePrompt,
  type ProfilePrompt,
} from "@/lib/profile/prompts";

/** Up to three prompts: pick one from the Kenyan library (or get a random one), then answer it. */
export function PromptsEditor({
  prompts,
  onChange,
}: {
  prompts: ProfilePrompt[];
  onChange: (next: ProfilePrompt[]) => void;
}) {
  // null = closed; a number = the slot being picked for (prompts.length means a new one).
  const [picking, setPicking] = useState<number | null>(null);
  const taken = prompts.map((p) => p.q);

  function choose(slot: number, q: string) {
    const list = [...prompts];
    list[slot] = { q, a: slot < prompts.length && prompts[slot].q === q ? prompts[slot].a : "" };
    onChange(list);
    setPicking(null);
  }

  return (
    <div>
      <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Prompts</span>
      <p className="mt-1 text-xs text-muted">
        Answer up to {MAX_PROMPTS}. Your first one shows on your Discover card, so make it count.
      </p>

      {prompts.map((prompt, index) => (
        <div key={`${index}-${prompt.q}`} className="mt-3 rounded-3xl border border-line bg-glass p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-gold uppercase">{prompt.q}</p>
            <div className="-mt-1 -mr-1 flex shrink-0">
              <button
                type="button"
                aria-label="Swap prompt"
                onClick={() => setPicking(index)}
                className="grid size-8 place-items-center rounded-full text-muted active:bg-white/10"
              >
                <Repeat2 className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Remove prompt"
                onClick={() => onChange(prompts.filter((_, i) => i !== index))}
                className="grid size-8 place-items-center rounded-full text-muted active:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <textarea
            value={prompt.a}
            aria-label={prompt.q}
            onChange={(e) => {
              const list = [...prompts];
              list[index] = { ...prompt, a: e.target.value };
              onChange(list);
            }}
            maxLength={MAX_PROMPT_ANSWER}
            rows={2}
            placeholder={promptHint(prompt.q)}
            className="mt-2 w-full resize-none bg-transparent text-[15px] leading-snug outline-none placeholder:text-cream/30"
          />
          <p className="text-right text-[11px] text-muted">
            {prompt.a.length}/{MAX_PROMPT_ANSWER}
          </p>
        </div>
      ))}

      {prompts.length < MAX_PROMPTS ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setPicking(prompts.length)}
            className="flex flex-1 items-center justify-center gap-2 rounded-3xl border border-dashed border-gold/40 py-4 text-sm text-gold"
          >
            <Plus className="size-4" />
            Add a prompt
          </button>
          <button
            type="button"
            onClick={() => {
              const q = surprisePrompt(taken);
              if (q) choose(prompts.length, q);
            }}
            className="flex items-center justify-center gap-2 rounded-3xl border border-line px-4 text-sm text-cream/80"
          >
            <Dices className="size-4 text-gold" />
            Surprise me
          </button>
        </div>
      ) : null}

      {picking !== null ? (
        <PromptPicker
          taken={taken.filter((_, i) => i !== picking)}
          current={prompts[picking]?.q ?? null}
          onPick={(q) => choose(picking, q)}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </div>
  );
}

function PromptPicker({
  taken,
  current,
  onPick,
  onClose,
}: {
  taken: string[];
  current: string | null;
  onPick: (q: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(PROMPT_CATEGORIES[0].id);
  const category = PROMPT_CATEGORIES.find((c) => c.id === tab) ?? PROMPT_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pick a prompt"
        className="flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-[28px] border border-line bg-bg-elevated pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <p className="font-display text-xl">Pick a prompt</p>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1" role="tablist">
          {PROMPT_CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              role="tab"
              aria-selected={c.id === tab}
              selected={c.id === tab}
              onClick={() => setTab(c.id)}
              className="shrink-0 px-3.5 py-2 text-xs"
            >
              {c.emoji} {c.label}
            </Chip>
          ))}
        </div>
        <ul className="mt-2 min-h-0 flex-1 overflow-y-auto px-3">
          {category.prompts.map((p) => {
            const used = taken.includes(p.q);
            return (
              <li key={p.q}>
                <button
                  type="button"
                  disabled={used}
                  onClick={() => onPick(p.q)}
                  className="w-full rounded-2xl px-3 py-3 text-left active:bg-white/5 disabled:opacity-40"
                >
                  <span className="flex items-center justify-between gap-2 text-[15px] text-cream">
                    {p.q}
                    {used ? <span className="text-[11px] text-muted">Used</span> : current === p.q ? <span className="text-[11px] text-gold">Current</span> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">e.g. {p.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
