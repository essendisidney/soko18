import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { CONSENT_VERSION, type ConsentState } from "@/lib/account/consent-client";

export { CONSENT_VERSION, needsConsent, type ConsentState } from "@/lib/account/consent-client";

const unauthorized = { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in." } };

export async function getConsents() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_consents");
  if (error) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Try again." } };
  return { ok: true as const, data: data as ConsentState };
}

const recordSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  terms: z.literal(true),
  sensitive: z.boolean(),
  marketing: z.boolean().optional().default(false),
});

export async function recordConsents(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Add your date of birth and accept the terms." } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_consents", {
    p_version: CONSENT_VERSION,
    p_date_of_birth: parsed.data.dateOfBirth,
    p_sensitive: parsed.data.sensitive,
    p_marketing: parsed.data.marketing,
  });
  if (error) {
    if (error.message.includes("underage")) {
      await supabase.auth.signOut({ scope: "global" });
      return { ok: false as const, status: 403, error: { code: "underage", message: "SOKO18 is for adults 18 and over." } };
    }
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Check your date of birth." } };
  }
  return { ok: true as const, data: data as ConsentState };
}

const setSchema = z.object({ kind: z.enum(["sensitive_data", "marketing"]), granted: z.boolean() });

export async function setConsent(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, error: { code: "invalid", message: "Unknown setting." } };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_consent", {
    p_kind: parsed.data.kind,
    p_granted: parsed.data.granted,
    p_version: CONSENT_VERSION,
  });
  if (error) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Try again." } };
  return { ok: true as const, data: data as ConsentState };
}
