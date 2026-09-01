import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { takeRateLimit } from "@/lib/security/limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  kind: z.literal("identity"),
});

export async function requestIdentityReview(input: unknown) {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Identity review only." } };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to verify." } };
  }

  const limited = takeRateLimit("uploads", user.id);
  if (!limited.ok) {
    return { ok: false as const, status: limited.status, error: limited.error };
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.from("verification_records").insert({
      account_id: user.id,
      kind: "identity",
      status: "pending",
    });
    if (error) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not queue identity." } };
    }
    return { ok: true as const, data: { status: "pending" as const, persisted: true } };
  }

  return { ok: true as const, data: { status: "pending" as const, persisted: false } };
}
