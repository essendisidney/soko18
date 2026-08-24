import { NextResponse } from "next/server";
import { rejectOwnerApprove } from "@/lib/media/guard";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const blocked = rejectOwnerApprove(body?.status);
  if (blocked) {
    return NextResponse.json(blocked.body, { status: blocked.status });
  }

  const mediaId = crypto.randomUUID();
  return NextResponse.json(
    {
      data: {
        mediaId,
        path: `profile-media/${mediaId}`,
        status: "uploaded",
        persisted: false,
      },
    },
    { status: 201 },
  );
}
