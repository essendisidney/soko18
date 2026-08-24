import { NextResponse } from "next/server";
import { listAdminReports } from "@/lib/admin/reports";

export async function GET() {
  const result = await listAdminReports();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
