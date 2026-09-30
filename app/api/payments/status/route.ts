import { NextResponse } from "next/server";
import { paymentStatus } from "@/lib/payments/intent";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const result = await paymentStatus(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
