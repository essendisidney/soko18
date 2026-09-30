/** Conversation starters, like Hinge/Bumble prompts. Max 3 per profile. */
export const PROMPT_QUESTIONS = [
  "My ideal Sunday in the city",
  "The way to win me over is",
  "Best nyama choma spot, fight me",
  "I’m looking for someone who",
  "A green flag I look for",
  "My most Kenyan habit",
  "Two truths and a lie",
  "I geek out on",
  "Dating me is like",
  "The last song I had on repeat",
] as const;

export type ProfilePrompt = { q: string; a: string };

export const MAX_PROMPTS = 3;
export const MAX_PROMPT_ANSWER = 150;

export function cleanPrompts(input: ProfilePrompt[] | undefined | null): ProfilePrompt[] {
  return (input ?? [])
    .map((p) => ({ q: p.q.trim().slice(0, 80), a: p.a.trim().slice(0, MAX_PROMPT_ANSWER) }))
    .filter((p) => p.q && p.a)
    .slice(0, MAX_PROMPTS);
}
