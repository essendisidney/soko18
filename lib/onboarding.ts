export const ONBOARDING = {
  age: "soko18_age_ok",
  city: "soko18_city",
  intent: "soko18_intent",
  done: "soko18_onboarded",
  visits: "soko18_visits",
  welcomeSeen: "soko18_welcome_seen",
  nearArea: "soko18_near_area",
} as const;

/** Guest 18+ flag only. Date of birth is not stored on the device. */
export function confirmAge() {
  localStorage.setItem(ONBOARDING.age, "1");
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

export function shouldShowWelcomeBack() {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(ONBOARDING.done) !== "1") return false;
  return sessionStorage.getItem(ONBOARDING.welcomeSeen) !== "1";
}

export function markWelcomeSeen() {
  sessionStorage.setItem(ONBOARDING.welcomeSeen, "1");
}
