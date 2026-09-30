import { hasFriendPass } from "@/lib/growth/referral";

export function reviewPriority() {
  return hasFriendPass();
}

export function reviewPriorityLine() {
  return hasFriendPass() ? "Friend pass · first in review." : null;
}
