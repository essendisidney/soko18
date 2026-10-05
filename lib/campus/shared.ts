/** Campus types and copy shared by the server, API routes and the Campus page. */

export type CampusStatus = "waitlist" | "live";

export type CampusBoardRow = {
  slug: string;
  name: string;
  shortName: string;
  town: string;
  status: CampusStatus;
  joined: number;
  target: number;
  openedAt: string | null;
  daysToOpen: number | null;
};

export type MyCampus = {
  slug: string;
  name: string;
  shortName: string;
  status: CampusStatus;
  joined: number;
  target: number;
  showOnProfile: boolean;
  method: "login_email" | "email_code";
  verifiedAt: string;
};

export const CAMPUS_SLUG = /^[a-z0-9-]{2,40}$/;

const REASONS: Record<string, string> = {
  unauthorized: "Sign in first.",
  adult_only: "Campus is for members 18 and over.",
  already: "You’re already verified at a campus.",
  not_campus: "Use your university email (for example name@students.uonbi.ac.ke). We don’t support that school yet.",
  taken: "That student email is already verifying another account.",
  wait: "We just sent a code. Wait a minute before asking for another.",
  limit: "That’s the most codes for today. Try again tomorrow.",
  expired: "That code has expired. Ask for a new one.",
  wrong: "That code isn’t right. Check the email and try again.",
  locked: "Too many wrong codes. Ask for a new one.",
  email_unavailable: "We can’t send email yet. If you signed in with your student email, tap “Use my sign-in email”.",
  invalid: "Something’s not right. Try again.",
};

export function campusReason(code: string) {
  return REASONS[code] ?? REASONS.invalid;
}

/** "212 of 300 students" → percentage for the progress bar, never 0 so the bar is visible. */
export function campusProgress(joined: number, target: number) {
  if (target <= 0) return 100;
  return Math.min(100, Math.max(3, Math.round((joined / target) * 100)));
}
