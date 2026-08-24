import { NextResponse } from "next/server";
import { listOwnPayments } from "@/lib/payments/own";

export async function GET() {
  const result = await listOwnPayments();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
