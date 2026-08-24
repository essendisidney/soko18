import { NextResponse } from "next/server";
import { exportOwnAccount } from "@/lib/account/export";

export async function POST() {
  const result = await exportOwnAccount();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
