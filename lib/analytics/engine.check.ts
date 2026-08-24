import { applyImpression, applyLikeStat, revenueKes, sanitizeAnalyticsEvent, studioWindows } from "./engine";

function assert(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const today = "2026-08-24";
let stats: { day: string; views: number; likes: number; matches: number }[] = [];
stats = applyImpression(stats, today);
stats = applyImpression(stats, today);
stats = applyLikeStat(stats, today, "pass");
stats = applyLikeStat(stats, today, "like");
assert(stats[0].views === 2, "impressions increment views");
assert(stats[0].likes === 1, "pass does not count as a like");

const windows = studioWindows(
  [
    { day: "2026-08-12", views: 10, likes: 2, matches: 1 },
    { day: "2026-08-18", views: 4, likes: 1, matches: 0 },
    { day: "2026-08-24", views: 6, likes: 1, matches: 1 },
  ],
  today,
);
assert(windows.recent.views === 10, "recent week is last 7 Nairobi days");
assert(windows.previous.views === 10, "previous week is the 7 days before that");
assert(windows.series.length === 7, "series fills empty days");
assert(windows.series[0].day === "2026-08-18", "series starts 6 days back");

assert(
  revenueKes(
    [
      { type: "payment", direction: "debit", amountKes: 500, createdAt: "2026-08-24T10:00:00.000+03:00" },
      { type: "featured", direction: "credit", amountKes: 3500, createdAt: "2026-08-24T10:00:00.000+03:00" },
      { type: "payment", direction: "debit", amountKes: 800, createdAt: "2026-07-01T10:00:00.000+03:00" },
    ],
    "2026-08-24T00:00:00.000+03:00",
    "2026-08-25T00:00:00.000+03:00",
  ) === 500,
  "admin revenue is ledger payment debits only",
);

const clean = sanitizeAnalyticsEvent({
  profileId: "p1",
  body: "secret message",
  media_path: "https://example.com/x.jpg",
  surface: "discover",
});
assert(!("body" in clean) && !("media_path" in clean), "never log message bodies or media URLs");
assert(clean.surface === "discover", "keeps non-sensitive fields");

console.log("analytics: impressions, deltas, ledger revenue");
