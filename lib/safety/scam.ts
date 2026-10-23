/** What the recipient sees under a flagged message. Calm, specific, never accusing. */

export type ScamFlag = "money" | "off_platform";

export const SCAM_NOTICE: Record<ScamFlag, string> = {
  money:
    "Careful: this mentions money. Nobody on Kutana needs M-Pesa, fare, a loan or gift cards from you to meet. If it feels off, report it.",
  off_platform:
    "They want to move off Kutana. Take your time: reporting and blocking only work here.",
};

export function scamNotice(flag: string | null | undefined) {
  return flag === "money" || flag === "off_platform" ? SCAM_NOTICE[flag] : null;
}
