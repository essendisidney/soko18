import { NextResponse } from "next/server";
import { scanStub } from "@/lib/media/scan";
import { rejectOwnerApprove } from "@/lib/media/guard";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const blocked = rejectOwnerApprove(body?.status);
  if (blocked) {
    return NextResponse.json(blocked.body, { status: blocked.status });
  }

  const scan = scanStub({
    name: String(body?.fileName ?? ""),
    type: String(body?.contentType ?? ""),
    size: Number(body?.size ?? 0),
  });

  if (!scan.ok) {
    return NextResponse.json(
      { error: { code: "invalid", message: "That file can’t be used." } },
      { status: 400 },
    );
  }

  return NextResponse.json({
    data: {
      mediaId: body?.mediaId,
      status: "pending_review",
      flagged: scan.flagged,
    },
  });
}
