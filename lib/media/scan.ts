const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function scanStub(file: { name: string; type: string; size: number }) {
  if (!ALLOWED.has(file.type)) {
    return { ok: false as const, reason: "not_image", flagged: false };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, reason: "too_large", flagged: false };
  }
  return {
    ok: true as const,
    reason: null,
    flagged: /flag|report|underage/i.test(file.name),
  };
}
