import { NextResponse } from "next/server";
import { decideQueueItem, loadQueue } from "@/lib/admin/queue";

export async function GET() {
  const result = await loadQueue();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  const result = await decideQueueItem(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
