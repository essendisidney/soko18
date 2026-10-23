import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { normalizeContactPhone } from "@/lib/safety/contact";
import { alertsReady, deliverOutbox } from "@/lib/safety/outbox";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { DatePlan } from "@/lib/safety/date-plan-shared";

const unauthorized = { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to plan a date." } };

const ERRORS: Record<string, string> = {
  invalid_place: "Say where you’re meeting, like “Java House, Westlands”.",
  invalid_time: "Pick when you’re meeting, within the next week.",
  invalid_checkin: "Pick a check-in time after the date starts, at least 10 minutes from now.",
  invalid_contact: "Add a trusted contact with a real phone number.",
  plan_active: "You already have a date plan running. Close it first.",
  rate_limited: "That’s a lot of plans today. Try again tomorrow.",
  not_found: "That plan is already closed.",
  not_allowed: "You can’t add more time to this plan.",
  banned: "Your account can’t do this.",
};

function fail(message: string, status = 400) {
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  return { ok: false as const, status, error: { code: key ?? "unavailable", message: key ? ERRORS[key] : "Something went wrong. Try again." } };
}

export async function myDatePlan() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const supabase = await createClient();
  const { data } = await supabase
    .from("date_plans")
    .select("id, place, starts_at, check_in_at, contact_name, status, extended")
    .eq("account_id", user.id)
    .in("status", ["active", "missed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan: DatePlan | null = data
    ? {
        id: data.id as string,
        place: data.place as string,
        startsAt: data.starts_at as string,
        checkInAt: data.check_in_at as string,
        contactName: (data.contact_name as string | null) ?? "",
        status: data.status as DatePlan["status"],
        canExtend: (data.extended as number) < 4,
      }
    : null;
  return { ok: true as const, data: { plan, alertsReady: alertsReady() } };
}

const startSchema = z.object({
  place: z.string().trim().min(2).max(120),
  startsAt: z.string().datetime({ offset: true }),
  checkInAt: z.string().datetime({ offset: true }),
  contactName: z.string().trim().min(1).max(40),
  contactPhone: z.string().trim().max(20),
});

export async function startDatePlan(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_place");
  const phone = normalizeContactPhone(parsed.data.contactPhone);
  if (!phone) return fail("invalid_contact");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_date_plan", {
    p_place: parsed.data.place,
    p_starts_at: parsed.data.startsAt,
    p_check_in_at: parsed.data.checkInAt,
    p_contact_name: parsed.data.contactName,
    p_contact_phone: phone,
  });
  if (error) return fail(error.message, error.message.includes("rate_limited") ? 429 : 400);
  return { ok: true as const, data };
}

const actionSchema = z.object({ id: z.string().uuid(), action: z.enum(["safe", "extend", "cancel"]) });

export async function updateDatePlan(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success) return fail("not_found");
  const supabase = await createClient();
  const fn = parsed.data.action === "safe" ? "date_plan_safe" : parsed.data.action === "extend" ? "date_plan_extend" : "date_plan_cancel";
  const { data, error } = await supabase.rpc(fn, { p_plan: parsed.data.id });
  if (error) return fail(error.message);
  // Checking in after a missed alert: tell the contact straight away.
  if ((data as { allClearSent?: boolean } | null)?.allClearSent) await deliverOutbox();
  return { ok: true as const, data: data ?? { ok: true } };
}
