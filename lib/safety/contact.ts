import { z } from "zod";

/**
 * A trusted contact for panic / share-my-date: a real phone number (Kenyan 07.., 01.., +254..,
 * or any +country number) and a short plain name. Stops the alert being used to send
 * arbitrary text to arbitrary numbers.
 */
export function normalizeContactPhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[\s()-]/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `+254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}

export const contactSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[\p{L}\p{M} .'-]+$/u, "Use a name, not a message."),
  phone: z
    .string()
    .trim()
    .max(20)
    .transform((value, ctx) => {
      const phone = normalizeContactPhone(value);
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "Use a real phone number, like 0712 345 678." });
        return z.NEVER;
      }
      return phone;
    }),
});
