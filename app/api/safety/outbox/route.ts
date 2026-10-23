import { NextResponse } from "next/server";
import { deliverOutbox } from "@/lib/safety/outbox";

/** Called by the database (pg_net) when a check-in is missed. Same shared secret as push. */
export async function POST(request: Request) {
  const secret = process.env.PUSH_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Nope." } }, { status: 401 });
  }
  return NextResponse.json({ data: await deliverOutbox() });
}
