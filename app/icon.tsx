import { ImageResponse } from "next/og";
import { appMark } from "@/lib/brand/app-mark";

export function generateImageMetadata() {
  return [
    { id: "192", contentType: "image/png", size: { width: 192, height: 192 } },
    { id: "512", contentType: "image/png", size: { width: 512, height: 512 } },
  ];
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id) === 192 ? 192 : 512;
  return new ImageResponse(appMark(size), { width: size, height: size });
}
