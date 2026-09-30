import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type SelfieStatus = {
  status: "none" | "pending" | "verified" | "rejected" | "expired";
  challenge?: string;
  submitted?: boolean;
  note?: string | null;
};

async function authed() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return null;
  return { user, supabase: await createClient() };
}

const unauthorized = { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to verify." } };

export async function selfieStatus() {
  const ctx = await authed();
  if (!ctx) return unauthorized;
  const { data, error } = await ctx.supabase.rpc("my_verification");
  if (error) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Try again." } };
  return { ok: true as const, data: data as SelfieStatus };
}

export async function startSelfie() {
  const ctx = await authed();
  if (!ctx) return unauthorized;
  const { data, error } = await ctx.supabase.rpc("start_selfie_check");
  if (error) {
    const message = error.message.includes("no_profile") ? "Save your profile first." : "Could not start verification.";
    return { ok: false as const, status: 400, error: { code: "invalid", message } };
  }
  return { ok: true as const, data: data as { id: string; challenge: string } };
}

const submitSchema = z.object({ id: z.string().uuid(), path: z.string().min(3).max(200) });

export async function submitSelfie(input: unknown) {
  const ctx = await authed();
  if (!ctx) return unauthorized;
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`${ctx.user.id}/`)) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Upload not found." } };
  }
  const { data, error } = await ctx.supabase.rpc("submit_selfie", { p_id: parsed.data.id, p_path: parsed.data.path });
  if (error) return { ok: false as const, status: 400, error: { code: "invalid", message: "Could not submit." } };
  return { ok: true as const, data };
}
