import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Daily: erase personal data of accounts deleted more than 30 days ago — photos, selfies,
 * profile, messages — and lock the login. Anonymous payment records are kept for tax/audit.
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Nope." } }, { status: 401 });
  }
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ data: { purged: 0, skipped: "no service key" } });

  const { data: due } = await admin.rpc("accounts_due_for_purge", { p_limit: 50 });
  let purged = 0;
  for (const row of (due ?? []) as { account_id: string }[]) {
    const id = row.account_id;
    for (const bucket of ["profile-media", "verification"]) {
      const { data: files } = await admin.storage.from(bucket).list(id, { limit: 100 });
      const paths = (files ?? []).map((file) => `${id}/${file.name}`);
      if (paths.length) await admin.storage.from(bucket).remove(paths);
    }
    const { error } = await admin.rpc("purge_account", { p_account: id });
    if (error) continue;
    await admin.auth.admin.updateUserById(id, {
      email: `deleted+${id}@invalid.soko18`,
      user_metadata: {},
      ban_duration: "876000h",
    });
    purged += 1;
  }
  return NextResponse.json({ data: { purged } });
}
