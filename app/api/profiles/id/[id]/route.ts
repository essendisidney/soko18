import { NextResponse } from "next/server";
import { rejectPaidFlags } from "@/lib/payments/flags";
import { rejectSelfPublish } from "@/lib/profile/schema";
import { saveProfile } from "@/lib/profile/save";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const blocked = rejectSelfPublish(body?.status);
  if (blocked) {
    return NextResponse.json(blocked.body, { status: blocked.status });
  }
  const paid = rejectPaidFlags(body);
  if (paid) {
    return NextResponse.json(paid.body, { status: paid.status });
  }

  const result = await saveProfile({
    ...body,
    id,
    status: body?.status === "pending_review" ? "pending_review" : body?.status === "paused" ? "paused" : "draft",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data, persisted: result.persisted });
}
