export const PENDING_ENGAGE_KEY = "soko18_pending_engage";
const MAX_AGE_MS = 30 * 60 * 1000;

export type PendingEngage = {
  profileId: string;
  kind: "like" | "spotlight";
  at: number;
};

function storage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function writePendingEngage(row: PendingEngage) {
  storage()?.setItem(PENDING_ENGAGE_KEY, JSON.stringify(row));
}

export function clearPendingEngage() {
  storage()?.removeItem(PENDING_ENGAGE_KEY);
}

export function readPendingEngage(now = Date.now()): PendingEngage | null {
  const raw = storage()?.getItem(PENDING_ENGAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingEngage>;
    if (
      typeof parsed.profileId !== "string" ||
      (parsed.kind !== "like" && parsed.kind !== "spotlight") ||
      typeof parsed.at !== "number"
    ) {
      clearPendingEngage();
      return null;
    }
    if (now - parsed.at > MAX_AGE_MS) {
      clearPendingEngage();
      return null;
    }
    return { profileId: parsed.profileId, kind: parsed.kind, at: parsed.at };
  } catch {
    clearPendingEngage();
    return null;
  }
}
