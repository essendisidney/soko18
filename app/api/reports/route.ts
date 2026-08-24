import { NextResponse } from "next/server";
import { submitReport } from "@/lib/messages/report";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await submitReport(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
