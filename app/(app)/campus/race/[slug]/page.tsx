import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampusRace } from "@/components/growth/campus-race";
import { publicCampusBoard } from "@/lib/campus/board";
import { rankRace } from "@/lib/campus/race";
import { CAMPUS_SLUG } from "@/lib/campus/shared";
import { siteUrl } from "@/lib/site";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!CAMPUS_SLUG.test(slug)) return null;
  const race = rankRace(await publicCampusBoard());
  const row = race.find((r) => r.slug === slug);
  return row ? { race, row } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) return { title: "Campus race" };
  const { row } = found;
  const description =
    row.status === "live"
      ? `${row.shortName} is open on Kutana. Verified students only.`
      : row.joined === 0
        ? `Be the first ${row.shortName} student on Kutana. ${row.shortName} opens at ${row.target} verified students.`
        : `${row.joined} of ${row.target} ${row.shortName} students are in. ${row.toGo} more to open. Verify with your student email.`;
  return { title: `${row.shortName} · Campus race`, description, openGraph: { title: `${row.shortName} · Campus race`, description } };
}

export default async function CampusRaceFocus({ params }: Props) {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) notFound();
  return <CampusRace race={found.race} origin={siteUrl()} focus={slug} />;
}
