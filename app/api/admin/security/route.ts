import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin/staff";
import { advisorBaseline } from "@/lib/security/advisors";

export async function GET() {
  const staff = await requireStaff();
  if (!staff.ok) {
    return NextResponse.json({ error: staff.error }, { status: staff.status });
  }
  return NextResponse.json({ data: advisorBaseline() });
}
