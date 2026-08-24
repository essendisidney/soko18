import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/user";
import { rejectOwnerApprove } from "@/lib/media/guard";
import { takeRateLimit } from "@/lib/security/limit";
import { STORAGE_AUDIT } from "@/lib/security/advisors";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in to upload." } }, { status: 401 });
  }

  const limited = takeRateLimit("uploads", user.id);
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: limited.status });
  }

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
        bucket: STORAGE_AUDIT.bucket,
        path: `${user.id}/${mediaId}`,
        status: "uploaded",
        persisted: false,
        public: false,
      },
    },
    { status: 201 },
  );
}
