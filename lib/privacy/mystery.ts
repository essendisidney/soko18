export function mysteryPick<T extends { id: string }>(profiles: T[], exclude: Iterable<string>) {
  const blocked = new Set(exclude);
  const pool = profiles.filter((row) => !blocked.has(row.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
