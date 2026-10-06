/**
 * Conversation starters, like Hinge/Bumble prompts, written for Kenya. Max 3 per profile.
 * The question text is what gets stored, so never reword a live one: add a new one instead.
 * Each prompt has an example answer, shown as the placeholder while someone writes theirs.
 */

export type PromptCategory = { id: string; label: string; emoji: string; prompts: { q: string; hint: string }[] };

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "mtaani",
    label: "Mtaani",
    emoji: "🏙️",
    prompts: [
      { q: "My most Kenyan habit", hint: "Saying “I’m almost there” when I haven’t left the house." },
      { q: "My ideal Sunday in the city", hint: "Karura in the morning, then pilau at my aunt’s." },
      { q: "Matatu, boda or Uber? Defend your answer", hint: "Matatu with loud music. The drama is free." },
      { q: "The mtaa I’ll always defend", hint: "Eastlands. Best food, best people, no debate." },
      { q: "My go-to weekend escape from the city", hint: "Naivasha with friends and too much nyama." },
      { q: "Ushago or the city for December?", hint: "Ushago. Shags Christmas hits different." },
      { q: "My Nairobi hidden gem", hint: "A tiny Ethiopian spot off Ngong Road. I’ll take you." },
    ],
  },
  {
    id: "chakula",
    label: "Chakula",
    emoji: "🍖",
    prompts: [
      { q: "Best nyama choma spot, fight me", hint: "Kenyatta Market. Bring your appetite, not your diet." },
      { q: "Chapati or ugali? Choose wisely", hint: "Chapati, but only if it’s soft and layered." },
      { q: "The dish I’ll cook to impress you", hint: "Coconut fish, Coast style. My mum’s recipe." },
      { q: "My order at the kibanda", hint: "Smokie pasua with extra kachumbari. Every time." },
      { q: "Tea or coffee? Strong opinions only", hint: "Chai with too much sugar. Don’t judge me." },
    ],
  },
  {
    id: "mapenzi",
    label: "Mapenzi",
    emoji: "💛",
    prompts: [
      { q: "The way to win me over is", hint: "A good playlist, better jokes, and showing up on time." },
      { q: "I’m looking for someone who", hint: "Can argue about football and still share the chips." },
      { q: "A green flag I look for", hint: "You’re kind to the waiter and the guard at the gate." },
      { q: "My love language, but make it Kenyan", hint: "Sending you bundles when you’re running low." },
      { q: "A perfect first date in my city", hint: "Coffee, a walk in Arboretum, then street food." },
      { q: "We’ll get along if", hint: "You laugh at your own jokes before you finish them." },
      { q: "Dating me is like", hint: "A road trip: good music, snacks, the odd wrong turn." },
    ],
  },
  {
    id: "vibes",
    label: "Vibes",
    emoji: "🎶",
    prompts: [
      { q: "The last song I had on repeat", hint: "Something by Sauti Sol. Always Sauti Sol." },
      { q: "The song that gets me on the dance floor", hint: "Anything gengetone after 11pm." },
      { q: "My comfort show", hint: "Old episodes of Papa Shirandula." },
      { q: "I geek out on", hint: "F1, African history and very niche podcasts." },
      { q: "A Sheng word I use too much", hint: "“Sasa.” It’s a greeting, a question, a whole mood." },
      { q: "My hustle outside the 9 to 5", hint: "Baking cakes for birthdays. Ask me for a slice." },
    ],
  },
  {
    id: "games",
    label: "Games",
    emoji: "🎲",
    prompts: [
      { q: "Two truths and a lie", hint: "I’ve met a president, I can’t swim, I’ve climbed Mt Kenya." },
      { q: "My hot take", hint: "Mandazi is better than doughnuts. Fight me." },
      { q: "Guess where I’m from by my order", hint: "Mukimo with beef stew and a cold soda." },
      { q: "Rate my karaoke song choice", hint: "“Malaika”, with full emotion." },
      { q: "Convince me to swipe right on you in one line", hint: "I’ll always save you the last samosa." },
    ],
  },
];

/** Every prompt question, in display order. Older questions stay valid because answers store the text. */
export const PROMPT_QUESTIONS = PROMPT_CATEGORIES.flatMap((category) => category.prompts.map((p) => p.q));

export function promptHint(q: string): string {
  for (const category of PROMPT_CATEGORIES) {
    const hit = category.prompts.find((p) => p.q === q);
    if (hit) return hit.hint;
  }
  return "Keep it short and real.";
}

/** A random prompt you haven't used yet. `rand` is injectable for tests. */
export function surprisePrompt(taken: string[], rand: () => number = Math.random): string | null {
  const left = PROMPT_QUESTIONS.filter((q) => !taken.includes(q));
  if (left.length === 0) return null;
  return left[Math.floor(rand() * left.length) % left.length];
}

export type ProfilePrompt = { q: string; a: string };

export const MAX_PROMPTS = 3;
export const MAX_PROMPT_ANSWER = 150;

export function cleanPrompts(input: ProfilePrompt[] | undefined | null): ProfilePrompt[] {
  return (input ?? [])
    .map((p) => ({ q: p.q.trim().slice(0, 80), a: p.a.trim().slice(0, MAX_PROMPT_ANSWER) }))
    .filter((p) => p.q && p.a)
    .slice(0, MAX_PROMPTS);
}
