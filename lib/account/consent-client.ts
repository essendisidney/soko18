export const CONSENT_VERSION = "2026-09-30";

export type ConsentState = {
  dateOfBirth: string | null;
  consents: Partial<Record<"terms" | "privacy" | "sensitive_data" | "marketing", { granted: boolean; version: string; at: string }>>;
};

export function needsConsent(state: ConsentState | null) {
  if (!state) return false;
  const terms = state.consents.terms;
  return !state.dateOfBirth || !terms?.granted || terms.version !== CONSENT_VERSION;
}
