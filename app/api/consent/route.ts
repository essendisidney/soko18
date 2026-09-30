import { NextResponse } from "next/server";
import { getConsents, recordConsents, setConsent } from "@/lib/account/consent";

function reply(result: { ok: true; data: unknown } | { ok: false; status: number; error: unknown }) {
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function GET() {
  return reply(await getConsents());
}

export async function POST(request: Request) {
  return reply(await recordConsents(await request.json().catch(() => null)));
}

export async function PATCH(request: Request) {
  return reply(await setConsent(await request.json().catch(() => null)));
}
