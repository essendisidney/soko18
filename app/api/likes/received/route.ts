import { NextResponse } from "next/server";
import { likedMe } from "@/lib/payments/entitlements";

export async function GET() {
  const result = await likedMe();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
