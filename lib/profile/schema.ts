import { z } from "zod";
import { NAIROBI_AREAS } from "@/lib/data/nairobi";
import { OWNER_PROFILE_STATUSES } from "@/lib/profile/types";

const maxBirthYear = () => new Date().getFullYear() - 18;
const areaSlugs: ReadonlySet<string> = new Set(NAIROBI_AREAS.map((a) => a.slug));

export const profileInputSchema = z.object({
  id: z.string().uuid().optional(),
  displayName: z.string().trim().min(1).max(40),
  birthYear: z.number().int().min(1940).max(maxBirthYear()).nullable(),
  areaSlug: z.string().refine((value) => areaSlugs.has(value), "Choose a Nairobi area."),
  bio: z.string().trim().max(280).optional().default(""),
  availability: z.string().trim().max(80).optional().default(""),
  indexPublic: z.boolean().optional().default(false),
  status: z.enum(OWNER_PROFILE_STATUSES).optional().default("draft"),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

export function apiError(code: string, message: string, status: number) {
  return { body: { error: { code, message } }, status };
}

export function rejectSelfPublish(status: string | undefined) {
  const value = status?.toLowerCase();
  if (value === "live" || value === "suspended" || value === "removed") {
    return apiError("forbidden", "Profiles cannot be published from the client.", 403);
  }
  return null;
}
