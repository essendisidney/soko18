import { NextResponse } from "next/server";
import { dispatchNotification } from "@/lib/push/send";

/** Called by the database (pg_net) when a notification row is created. */
export async function POST(request: Request) {
  const secret = process.env.PUSH_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Nope." } }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { notificationId?: string } | null;
  if (!body?.notificationId) return NextResponse.json({ data: { sent: 0 } });
  return NextResponse.json({ data: await dispatchNotification(body.notificationId) });
}
