/**
 * Campus race: rank campuses by real verified students and write share text that names a real
 * rival. Never invents numbers: every figure comes from campus_board().
 */
import type { CampusBoardRow } from "@/lib/campus/shared";

export type RaceRow = CampusBoardRow & {
  /** 1-based place among campuses still racing (live campuses have none). */
  place: number | null;
  /** Students still needed to open; 0 once live. */
  toGo: number;
};

/** Open campuses first (they've won), then the race by students in, then by name. */
export function rankRace(board: CampusBoardRow[]): RaceRow[] {
  const live = board
    .filter((row) => row.status === "live")
    .sort((a, b) => (a.openedAt ?? "").localeCompare(b.openedAt ?? "") || a.name.localeCompare(b.name));
  const racing = board
    .filter((row) => row.status !== "live")
    .sort((a, b) => b.joined - a.joined || a.name.localeCompare(b.name));
  return [
    ...live.map((row) => ({ ...row, place: null, toGo: 0 })),
    ...racing.map((row, i) => ({ ...row, place: i + 1, toGo: Math.max(0, row.target - row.joined) })),
  ];
}

/** The closest campus still racing: the one just ahead, or the one just behind if you lead. */
export function rivalOf(race: RaceRow[], slug: string): RaceRow | null {
  const racing = race.filter((row) => row.place != null);
  const i = racing.findIndex((row) => row.slug === slug);
  if (i < 0) return null;
  const rival = racing[i - 1] ?? racing[i + 1] ?? null;
  // Racing against a campus nobody has joined yet isn't a race.
  return rival && rival.joined > 0 ? rival : null;
}

export function raceUrl(origin: string, slug?: string) {
  return slug ? `${origin}/campus/race/${slug}` : `${origin}/campus/race`;
}

/** WhatsApp-ready text. Only real counts; a rival is named only when one exists. */
export function raceShareText(race: RaceRow[], slug: string, origin: string): string {
  const row = race.find((r) => r.slug === slug);
  if (!row) return `Which campus opens first on Kutana? Verified students only. ${raceUrl(origin)}`;
  const url = raceUrl(origin, row.slug);
  if (row.status === "live") {
    return `${row.shortName} is open on Kutana 🎓 Verified ${row.shortName} students only. Verify with your student email: ${url}`;
  }
  if (row.joined === 0) {
    return `Be the first ${row.shortName} student on Kutana. ${row.shortName} opens when ${row.target} students verify with their student email 🎓 ${url}`;
  }
  const rival = rivalOf(race, slug);
  const versus = rival
    ? rival.place! < row.place!
      ? ` ${rival.shortName} is ahead with ${rival.joined}. Let's pass them.`
      : ` We're ahead of ${rival.shortName} (${rival.joined}). Keep it that way.`
    : "";
  const need = row.toGo === 1 ? "1 more student" : `${row.toGo} more students`;
  return `${row.shortName} needs ${need} to open on Kutana (${row.joined} of ${row.target} in).${versus} Verify with your student email 🎓 ${url}`;
}

export function whatsappHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
