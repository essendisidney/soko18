import { NextResponse } from "next/server";
import { spendBoost } from "@/lib/payments/entitlements";

export async function POST() {
  const result = await spendBoost();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
