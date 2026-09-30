import { NextResponse } from "next/server";
import { submitSelfie } from "@/lib/trust/selfie";

export async function POST(request: Request) {
  const result = await submitSelfie(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
