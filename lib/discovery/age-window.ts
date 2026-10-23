import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AgeWindow = { age: number | null; min: number; max: number };

/** The signed-in member's age range as the database keeps it (K1 age bands). Null for guests. */
export async function myAgeWindow(): Promise<AgeWindow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.rpc("my_age_window");
  return (data as AgeWindow | null) ?? null;
}

/** Default range for a member's age: 18–25 see ±4 years, everyone else everyone. */
export function defaultAgeWindow(age: number | null): { min: number; max: number } {
  if (age != null && age >= 18 && age <= 25) return { min: Math.max(18, age - 4), max: age + 4 };
  return { min: 18, max: 99 };
}
