import type { Metadata } from "next";
import { MatchList } from "@/components/matches/match-list";
import { listMatches } from "@/lib/likes/list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chats",
  robots: { index: false, follow: false },
};

export default async function MatchesPage() {
  const items = await listMatches();

  return (
    <div className="pb-6">
      <h1 className="font-display text-[34px] leading-none tracking-tight">Chats</h1>
      <MatchList items={items} />
    </div>
  );
}
