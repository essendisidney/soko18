import { NextResponse } from "next/server";
import { myGifts, respondGift, startGift } from "@/lib/gifts/gifts";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await myGifts();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

/** Pick a gift for a match. Payment follows through normal checkout with the gift id. */
export async function POST(request: Request) {
  const result = await startGift(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

/** Accept or decline a gift you received. */
export async function PATCH(request: Request) {
  const result = await respondGift(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
