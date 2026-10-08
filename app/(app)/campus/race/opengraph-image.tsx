import { ImageResponse } from "next/og";
import { publicCampusBoard } from "@/lib/campus/board";
import { rankRace } from "@/lib/campus/race";
import { RACE_IMAGE_SIZE, raceBoardImage } from "@/lib/campus/race-image";

export const alt = "Kutana campus race: real counts of verified students";
export const size = RACE_IMAGE_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image() {
  return new ImageResponse(raceBoardImage(rankRace(await publicCampusBoard())), size);
}
