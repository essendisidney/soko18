import { NextResponse } from "next/server";
import { ignoreIntro, myIntros, sendIntro } from "@/lib/likes/premium";

export async function GET() {
  const result = await myIntros();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  const result = await sendIntro(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

/** Ignore a message: it leaves Likes You and never becomes a chat. */
export async function DELETE(request: Request) {
  const result = await ignoreIntro(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
