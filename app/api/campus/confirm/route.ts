import { NextResponse } from "next/server";
import { confirmEmailCode } from "@/lib/campus/server";

/** Confirm the emailed code: { code }. */
export async function POST(request: Request) {
  const result = await confirmEmailCode(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
