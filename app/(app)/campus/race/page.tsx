import type { Metadata } from "next";
import { CampusRace } from "@/components/growth/campus-race";
import { publicCampusBoard } from "@/lib/campus/board";
import { rankRace } from "@/lib/campus/race";
import { siteUrl } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Campus race",
  description: "Which campus opens first on Kutana? Real counts of verified students, 18+.",
};

export default async function CampusRacePage() {
  const race = rankRace(await publicCampusBoard());
  return <CampusRace race={race} origin={siteUrl()} />;
}
