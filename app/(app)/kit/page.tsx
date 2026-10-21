import type { Metadata } from "next";
import { AmbassadorKit } from "@/components/growth/ambassador-kit";
import { publicCampusBoard } from "@/lib/campus/board";
import { rankRace } from "@/lib/campus/race";
import { siteUrl } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = { title: "Ambassador kit", robots: { index: false, follow: false } };

export default async function KitPage() {
  return <AmbassadorKit race={rankRace(await publicCampusBoard())} origin={siteUrl()} />;
}
