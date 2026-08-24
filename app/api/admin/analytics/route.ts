import { NextResponse } from "next/server";
import { getAdminAnalytics } from "@/lib/admin/analytics";

export async function GET() {
  const result = await getAdminAnalytics();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
