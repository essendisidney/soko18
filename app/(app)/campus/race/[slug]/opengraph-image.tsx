import { ImageResponse } from "next/og";
import { publicCampusBoard } from "@/lib/campus/board";
import { rankRace } from "@/lib/campus/race";
import { RACE_IMAGE_SIZE, campusRaceImage, raceBoardImage } from "@/lib/campus/race-image";

export const alt = "Kutana campus race";
export const size = RACE_IMAGE_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const race = rankRace(await publicCampusBoard());
  const row = race.find((r) => r.slug === slug);
  return new ImageResponse(row ? campusRaceImage(row) : raceBoardImage(race), size);
}
