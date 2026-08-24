import { NextResponse } from "next/server";
import { listConversations } from "@/lib/messages/list";

export async function GET() {
  const result = await listConversations();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
