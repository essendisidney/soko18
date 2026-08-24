import { PROFILES } from "@/lib/data/seed";

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

export function uniqueProfileSlug(name: string, taken: Iterable<string> = PROFILES.map((p) => p.slug)) {
  const reserved = new Set(taken);
  const stem = `${slugifyName(name)}-nairobi`;
  if (!reserved.has(stem)) return stem;
  let n = 2;
  while (reserved.has(`${stem}-${n}`)) n += 1;
  return `${stem}-${n}`;
}
