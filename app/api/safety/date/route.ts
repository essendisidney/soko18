import { NextResponse } from "next/server";
import { myDatePlan, startDatePlan, updateDatePlan } from "@/lib/safety/date-plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await myDatePlan();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  const result = await startDatePlan(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function PATCH(request: Request) {
  const result = await updateDatePlan(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
