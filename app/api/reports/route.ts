import { NextResponse } from "next/server";
import { submitReport } from "@/lib/messages/report";
import { submitProfileReport } from "@/lib/reports/profile";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const isProfile =
    body &&
    typeof body === "object" &&
    "profileId" in body &&
    !("conversationId" in body && body.conversationId);
  const result = isProfile ? await submitProfileReport(body) : await submitReport(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
