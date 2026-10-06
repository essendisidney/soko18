import { NextResponse } from "next/server";
import { claimFromLogin } from "@/lib/campus/server";

/** Verify with the student email the member signed in with. */
export async function POST() {
  const result = await claimFromLogin();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
