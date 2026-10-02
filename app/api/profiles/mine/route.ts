import { NextResponse } from "next/server";
import { loadMyProfile } from "@/lib/profile/mine";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadMyProfile();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data }, { headers: { "Cache-Control": "no-store" } });
}
