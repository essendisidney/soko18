/** Launch dashboard maths: totals and the plan's next milestone, from real daily rows. */
export type DayRow = {
  day: string;
  signups: number;
  went_live: number;
  students: number;
  invites: number;
  likes: number;
  matches: number;
  messages: number;
  paid: number;
  revenue_kes: number;
};

export const DAY_KEYS = ["signups", "went_live", "students", "invites", "likes", "matches", "messages", "paid", "revenue_kes"] as const;

export function totals(rows: DayRow[]) {
  const out = Object.fromEntries(DAY_KEYS.map((k) => [k, 0])) as Record<(typeof DAY_KEYS)[number], number>;
  for (const row of rows) for (const k of DAY_KEYS) out[k] += Number(row[k] ?? 0);
  return out;
}

/** The two-week plan: first 10 students at one campus, then its target (it opens), then the rival. */
export function nextMilestone(leader: { shortName: string; joined: number; target: number; status: string } | undefined) {
  if (!leader) return "Pick one campus and get its first 10 students verified.";
  if (leader.status === "live") return `${leader.shortName} is open. Hold its launch night, then start on the rival campus.`;
  if (leader.joined < 10) return `${leader.shortName}: ${10 - leader.joined} more to reach the first 10.`;
  return `${leader.shortName}: ${leader.target - leader.joined} more to open (${leader.joined}/${leader.target}).`;
}
