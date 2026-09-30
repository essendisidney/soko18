import { PROFILES } from "@/lib/data/seed";
import { isKenyaCitySlug } from "@/lib/geo/kenya";

export function slugifyName(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32);
  return base || "profile";
}

export function uniqueProfileSlug(
  name: string,
  taken: Iterable<string> = PROFILES.map((p) => p.slug),
  citySlug = "nairobi",
) {
  const reserved = new Set(taken);
  const city = isKenyaCitySlug(citySlug) ? citySlug : "nairobi";
  const stem = `${slugifyName(name)}-${city}`;
  if (!reserved.has(stem)) return stem;
  let n = 2;
  while (reserved.has(`${stem}-${n}`)) n += 1;
  return `${stem}-${n}`;
}
