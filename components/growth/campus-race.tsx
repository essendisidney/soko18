import Link from "next/link";
import { CalendarPlus, GraduationCap, PartyPopper, Trophy } from "lucide-react";
import { launchDay, launchNight } from "@/lib/campus/launch";
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
          <LaunchNightNote row={focused} />
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
        <Link href="/q" className="mt-3 block text-xs text-gold">
          Doing a street interview or a Status post? Use the question of the week →
        </Link>
        <Link href="/kit" className="mt-2 block text-xs text-gold">
          Ambassador? Get the kit: links, ready messages and a printable poster →
        </Link>
      </section>
    </div>
  );
}

/** The launch party: the first Sunday live night after a campus opens. */
function LaunchNightNote({ row }: { row: RaceRow }) {
  const night = launchNight(row);
  if (!night) return null;
  if (night.kind === "promise") {
    return (
      <p className="mt-4 flex gap-2 text-sm text-cream/85">
        <PartyPopper className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
        <span>
          The Sunday after {row.shortName} hits {row.target}, it’s {row.shortName} launch night: everyone swipes at 8pm.
        </span>
      </p>
    );
  }
  return (
    <div className="mt-4 rounded-2xl border border-gold/40 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-gold">
        <PartyPopper className="size-4" aria-hidden />
        {night.live ? `${row.shortName} launch night is on now` : `${row.shortName} launch night`}
      </p>
      <p className="mt-1 text-cream/85">
        {night.live ? "Everyone’s swiping until 10pm." : `${launchDay(night.start)}, 8–10pm. Bring your friends.`}
      </p>
      {!night.live ? (
        <a href="/api/live-night/ics" download className="mt-2 inline-flex items-center gap-1.5 text-xs text-cream/80">
          <CalendarPlus className="size-3.5" aria-hidden /> Add to my calendar
        </a>
      ) : null}
    </div>
  );
}
