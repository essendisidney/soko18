import { hasFriendPass } from "@/lib/growth/referral";

export function reviewPriority() {
  return hasFriendPass();
}

export function reviewPriorityLine() {
  return hasFriendPass() ? "Invited by a member · your welcome gift unlocks when you’re approved." : null;
}
