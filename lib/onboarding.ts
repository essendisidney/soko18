export const ONBOARDING = {
  age: "soko18_age_ok",
  city: "soko18_city",
  intent: "soko18_intent",
  done: "soko18_onboarded",
  visits: "soko18_visits",
  welcomeSeen: "soko18_welcome_seen",
  nearArea: "soko18_near_area",
} as const;

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
    intent: (localStorage.getItem(ONBOARDING.intent) ?? "").split(",").filter(Boolean),
    done: localStorage.getItem(ONBOARDING.done) === "1",
  };
}

export function bumpVisit() {
  if (typeof window === "undefined") return 1;
  const next = Number(localStorage.getItem(ONBOARDING.visits) ?? "0") + 1;
  localStorage.setItem(ONBOARDING.visits, String(next));
  return next;
}

export function shouldShowWelcomeBack() {
  if (typeof window === "undefined") return false;
  const visits = Number(localStorage.getItem(ONBOARDING.visits) ?? "0");
  const seen = sessionStorage.getItem(ONBOARDING.welcomeSeen) === "1";
  return visits > 1 && !seen;
}

export function markWelcomeSeen() {
  sessionStorage.setItem(ONBOARDING.welcomeSeen, "1");
}
