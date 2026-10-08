import Link from "next/link";
import { GraduationCap, Trophy } from "lucide-react";
import { Button } from "@/components/soko/button";
import { RaceShare } from "@/components/growth/race-share";
import { raceShareText, raceUrl, type RaceRow } from "@/lib/campus/race";
import { campusProgress } from "@/lib/campus/shared";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

/** The campus race: open campuses on top, then the race by real verified students. */
export function CampusRace({ race, origin, focus }: { race: RaceRow[]; origin: string; focus?: string }) {
  const focused = focus ? race.find((row) => row.slug === focus) : undefined;

  return (
    <div className="pb-10">
      <p className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.22em] text-gold uppercase">
        <Trophy className="size-3.5" aria-hidden />
        Campus race
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">
        {focused ? (focused.status === "live" ? `${focused.shortName} is open` : `Help open ${focused.shortName}`) : "Which campus opens first?"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Each campus opens on Kutana when enough students verify with their student email. Then verified students there get a deck of
        people from their own campus.
      </p>

      {focused ? (
        <section className="mt-6 rounded-3xl border border-gold/40 bg-gold/[0.06] p-5">
          <p className="inline-flex items-center gap-2 font-medium">
            <GraduationCap className="size-5 text-gold" aria-hidden />
            {focused.name}
          </p>
          {focused.status === "live" ? (
            <p className="mt-2 text-sm text-cream/85">Open. Verify with your student email to get the {focused.shortName} deck.</p>
          ) : (
            <>
              <p className="mt-3 font-display text-4xl leading-none">
                {focused.joined}
                <span className="text-lg text-muted"> / {focused.target}</span>
              </p>
              <p className="mt-1 text-sm text-cream/85">
                {focused.joined === 0
                  ? `No one from ${focused.shortName} yet. Be the first, then bring your friends.`
                  : `${focused.toGo === 1 ? "1 more student" : `${focused.toGo} more students`} to open · #${focused.place} in the race`}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gold" style={{ width: `${campusProgress(focused.joined, focused.target)}%` }} />
              </div>
            </>
          )}
          <div className="mt-5">
            <RaceShare text={raceShareText(race, focused.slug, origin)} url={raceUrl(origin, focused.slug)} />
          </div>
        </section>
      ) : null}

      <Link href="/campus" className="mt-5 block">
        <Button variant="gold" className="w-full">
          Verify my campus
        </Button>
      </Link>

      <section className="mt-8">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Standings</h2>
        {race.length === 0 ? (
          <p className="mt-3 text-sm text-muted">The race hasn’t started yet.</p>
        ) : (
          <ol className="mt-3 space-y-2.5">
            {race.map((row) => (
              <li
                key={row.slug}
                className={cn(
                  "rounded-3xl border p-4",
                  row.slug === focus ? "border-gold/60 bg-gold/[0.04]" : "border-line",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-7 shrink-0 text-center font-display text-lg"
                    aria-label={row.place == null ? "Open" : row.joined > 0 ? `Place ${row.place}` : "Not started"}
                  >
                    {row.place == null ? "✅" : row.joined > 0 ? (MEDALS[row.place - 1] ?? row.place) : <span className="text-muted">·</span>}
                  </span>
                  <Link href={`/campus/race/${row.slug}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {row.shortName} <span className="text-xs font-normal text-muted">{row.town}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {row.status === "live"
                        ? row.daysToOpen != null
                          ? `Open · took ${row.daysToOpen} day${row.daysToOpen === 1 ? "" : "s"}`
                          : "Open"
                        : row.joined === 0
                          ? `Be the first · opens at ${row.target}`
                          : `${row.joined} of ${row.target} · ${row.toGo} to go`}
                    </p>
                  </Link>
                  <RaceShare compact text={raceShareText(race, row.slug, origin)} url={raceUrl(origin, row.slug)} />
                </div>
                {row.status !== "live" ? (
                  <div className="mt-3 ml-10 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${campusProgress(row.joined, row.target)}%` }} />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-xs text-muted">
          Counts are real verified students, 18 and over. Nobody sees who verified. Don’t see your school? Tell us and we’ll add it.
        </p>
      </section>
    </div>
  );
}
