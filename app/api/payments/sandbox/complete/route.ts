import { NextResponse } from "next/server";
import { completeSandboxPayment } from "@/lib/payments/settle";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await completeSandboxPayment(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
