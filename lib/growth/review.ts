import { hasFriendPass } from "@/lib/growth/referral";
import { hasSkipLine } from "@/lib/growth/skip";

export function reviewPriority() {
  return hasSkipLine() || hasFriendPass();
}

export function reviewPriorityLine() {
  const skip = hasSkipLine();
  const pass = hasFriendPass();
  if (skip && pass) return "Skip the line · friend pass · first in review.";
  if (skip) return "Skip the line · first in review.";
  if (pass) return "Friend pass · first in review.";
  return null;
}
