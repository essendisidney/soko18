import { NextResponse } from "next/server";
import { listAdminUsers } from "@/lib/admin/users";

export async function GET() {
  const result = await listAdminUsers();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
