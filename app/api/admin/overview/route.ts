import { NextResponse } from "next/server";
import { getAdminOverview } from "@/lib/admin/overview";

export async function GET() {
  const result = await getAdminOverview();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
