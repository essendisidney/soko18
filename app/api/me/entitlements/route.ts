import { NextResponse } from "next/server";
import { getEntitlements } from "@/lib/payments/entitlements";

export async function GET() {
  const result = await getEntitlements();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
