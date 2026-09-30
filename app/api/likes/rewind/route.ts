import { NextResponse } from "next/server";
import { rewindLastPass } from "@/lib/likes/premium";

export async function POST() {
  const result = await rewindLastPass();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
