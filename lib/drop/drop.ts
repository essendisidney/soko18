import { currentUser } from "@/lib/auth/user";
import { coversFor } from "@/lib/discovery/live";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import type { MyDrop } from "@/lib/drop/shared";

export type { DropPick, MyDrop } from "@/lib/drop/shared";

/** Today's picks for the signed-in member, with signed cover photos. Real people only. */
export async function myDrop() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to see today’s picks." } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_drop");
  if (error || !data) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Could not load today’s picks." } };
  const drop = data as MyDrop;
  if (drop.picks.length) {
    const covers = await coversFor(drop.picks.map((p) => p.profileId));
    drop.picks = drop.picks.map((p) => ({ ...p, photo: covers.get(p.profileId) ?? null }));
  }
  return { ok: true as const, data: drop };
}
