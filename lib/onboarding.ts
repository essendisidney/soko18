export const ONBOARDING = {
  age: "soko18_age_ok",
  city: "soko18_city",
  intent: "soko18_intent",
  showMe: "soko18_show_me",
  ageRange: "soko18_age_range",
  done: "soko18_onboarded",
  visits: "soko18_visits",
  welcomeSeen: "soko18_welcome_seen",
  nearArea: "soko18_near_area",
} as const;

/**
 * Guest 18+ flag. The date of birth itself is kept on this device for two hours only, so the
 * sign-up step can pre-fill it instead of asking twice, even when the sign-in link opens in a new
 * tab. It is cleared as soon as the account has it, and never kept long-term on the device.
 */
export const DOB_HANDOFF = "soko18_dob_once";
const DOB_HANDOFF_MS = 2 * 60 * 60 * 1000;

export function confirmAge(dob?: string, now = Date.now()) {
  localStorage.setItem(ONBOARDING.age, "1");
  if (dob) {
    try {
      localStorage.setItem(DOB_HANDOFF, JSON.stringify({ dob, at: now }));
    } catch {}
  }
}

export function parseDobHandoff(raw: string | null, now = Date.now()) {
  if (!raw) return "";
  try {
    const row = JSON.parse(raw) as { dob?: unknown; at?: unknown };
    if (typeof row.dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) return "";
    if (typeof row.at !== "number" || now - row.at > DOB_HANDOFF_MS || row.at > now + 60_000) return "";
    return row.dob;
  } catch {
    return "";
  }
}

export function takeDobHandoff() {
  try {
    const dob = parseDobHandoff(localStorage.getItem(DOB_HANDOFF));
    if (!dob) localStorage.removeItem(DOB_HANDOFF);
    return dob;
  } catch {
    return "";
  }
}

export function clearDobHandoff() {
  try {
    localStorage.removeItem(DOB_HANDOFF);
    sessionStorage.removeItem(DOB_HANDOFF);
  } catch {}
}

export function readOnboarding() {
  if (typeof window === "undefined") {
    return {
      age: false,
      city: "nairobi" as string | null,
      intent: [] as string[],
      done: false,
    };
  }
  return {
    age: localStorage.getItem(ONBOARDING.age) === "1",
    city: localStorage.getItem(ONBOARDING.city) ?? "nairobi",
    intent: readIntents(),
    done: localStorage.getItem(ONBOARDING.done) === "1",
  };
}

export function readIntents() {
  if (typeof window === "undefined") return [] as string[];
  return (localStorage.getItem(ONBOARDING.intent) ?? "").split(",").filter(Boolean);
}

export function intentSnapshot() {
  return localStorage.getItem(ONBOARDING.intent);
}

const intentListeners = new Set<() => void>();

export function subscribeIntents(onChange: () => void) {
  intentListeners.add(onChange);
  return () => {
    intentListeners.delete(onChange);
  };
}

export function writeIntents(ids: string[]) {
  localStorage.setItem(ONBOARDING.intent, ids.join(","));
  intentListeners.forEach((listen) => listen());
}

export function bumpVisit() {
  if (typeof window === "undefined") return 1;
  const next = Number(localStorage.getItem(ONBOARDING.visits) ?? "0") + 1;
  localStorage.setItem(ONBOARDING.visits, String(next));
  return next;
}

/** The "welcome back" screen shows at most once a day, not on every open of the installed app. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

export function welcomeSeenToday() {
  try {
    return localStorage.getItem(ONBOARDING.welcomeSeen) === today();
  } catch {
    return true;
  }
}

export function shouldShowWelcomeBack() {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(ONBOARDING.done) !== "1") return false;
  return !welcomeSeenToday();
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(ONBOARDING.welcomeSeen, today());
  } catch {}
}

export type ShowMe = "woman" | "man" | "any";

export function readShowMe(): ShowMe {
  if (typeof window === "undefined") return "any";
  const value = localStorage.getItem(ONBOARDING.showMe);
  return value === "woman" || value === "man" ? value : "any";
}

export function showMeSnapshot() {
  return localStorage.getItem(ONBOARDING.showMe);
}

export function writeShowMe(value: ShowMe) {
  localStorage.setItem(ONBOARDING.showMe, value);
  intentListeners.forEach((listen) => listen());
}

export type AgeRange = { min: number; max: number };
export const DEFAULT_AGE_RANGE: AgeRange = { min: 18, max: 60 };

export function readAgeRange(): AgeRange {
  if (typeof window === "undefined") return DEFAULT_AGE_RANGE;
  try {
    const parsed = JSON.parse(localStorage.getItem(ONBOARDING.ageRange) ?? "null") as AgeRange | null;
    if (!parsed) return DEFAULT_AGE_RANGE;
    const min = Math.max(18, Math.min(99, Math.round(parsed.min)));
    const max = Math.max(min, Math.min(99, Math.round(parsed.max)));
    return { min, max };
  } catch {
    return DEFAULT_AGE_RANGE;
  }
}

export function writeAgeRange(range: AgeRange) {
  localStorage.setItem(ONBOARDING.ageRange, JSON.stringify(range));
  intentListeners.forEach((listen) => listen());
}

export function ageRangeSnapshot() {
  return localStorage.getItem(ONBOARDING.ageRange);
}
