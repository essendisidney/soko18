import { NextResponse } from "next/server";
import { selfieStatus, startSelfie } from "@/lib/trust/selfie";

export async function GET() {
  const result = await selfieStatus();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function POST() {
  const result = await startSelfie();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
