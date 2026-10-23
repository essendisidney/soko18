export type Vouches = { count: number; names: string[]; mine: boolean; canVouch: boolean };

/** "Vouched by Wanjiru and Otieno", "Vouched by Wanjiru, Otieno and 2 more". First names only. */
export function vouchLine(v: Pick<Vouches, "count" | "names">): string | null {
  if (v.count <= 0) return null;
  const names = v.names.slice(0, 3);
  if (names.length === 0) return v.count === 1 ? "Vouched by 1 friend" : `Vouched by ${v.count} friends`;
  const rest = v.count - names.length;
  if (rest > 0) return `Vouched by ${names.join(", ")} and ${rest} more`;
  if (names.length === 1) return `Vouched by ${names[0]}`;
  return `Vouched by ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
