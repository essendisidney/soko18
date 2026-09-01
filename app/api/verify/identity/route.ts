import { NextResponse } from "next/server";
import { requestIdentityReview } from "@/lib/trust/identity";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await requestIdentityReview(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
