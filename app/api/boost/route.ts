import { NextResponse } from "next/server";
import { useBoost } from "@/lib/payments/entitlements";

export async function POST() {
  const result = await useBoost();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
