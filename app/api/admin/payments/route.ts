import { NextResponse } from "next/server";
import { listAdminPayments } from "@/lib/admin/payments";

export async function GET() {
  const result = await listAdminPayments();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
