import { NextResponse } from "next/server";
import { cityPayload } from "@/lib/browse/cities";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const city = cityPayload(slug);
  if (!city) {
    return NextResponse.json({ error: { code: "not_found", message: "Unknown city." } }, { status: 404 });
  }
  return NextResponse.json({ data: city });
}
