import { NextResponse } from "next/server";
import { deleteOwnAccount } from "@/lib/account/delete";

export async function POST() {
  const result = await deleteOwnAccount();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
