import { MatchList } from "@/components/matches/match-list";
import { listMatches } from "@/lib/likes/list";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const items = await listMatches();

  return (
    <div>
      <h1 className="font-display text-[34px] tracking-tight">Matches</h1>
      <p className="mt-1 text-sm text-muted">People you both liked.</p>
      <MatchList items={items} />
    </div>
  );
}
