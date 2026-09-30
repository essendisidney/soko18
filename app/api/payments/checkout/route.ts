import { NextResponse } from "next/server";
import { createPaymentIntent } from "@/lib/payments/intent";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await createPaymentIntent(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
