import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/admin/staff";
import { COST_CATEGORIES } from "@/lib/admin/economics";
import { createClient } from "@/lib/supabase/server";

const body = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
  category: z.enum(COST_CATEGORIES),
  amountKes: z.number().min(0).max(100_000_000),
  note: z.string().max(200).optional(),
});

/** Admin enters a monthly cost. The database refuses anyone who isn't an admin. */
export async function POST(request: Request) {
  const staff = await requireStaff();
  if (!staff.ok) return NextResponse.json({ error: staff.error }, { status: staff.status });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid", message: "Check the amount." } }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_admin_cost", {
    p_month: parsed.data.month,
    p_category: parsed.data.category,
    p_amount: parsed.data.amountKes,
    p_note: parsed.data.note ?? null,
  });
  if (error) return NextResponse.json({ error: { code: "forbidden", message: "Admins only." } }, { status: 403 });
  return NextResponse.json({ data: { ok: true } });
}
