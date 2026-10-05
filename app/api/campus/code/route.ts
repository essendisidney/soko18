import { NextResponse } from "next/server";
import { startEmailCode } from "@/lib/campus/server";

/** Email a 6-digit code to a student address: { email }. */
export async function POST(request: Request) {
  const result = await startEmailCode(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
