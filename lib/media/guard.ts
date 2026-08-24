import { apiError } from "@/lib/profile/schema";
import { isPublicMediaStatus, type MediaStatus } from "@/lib/media/types";

export function rejectOwnerApprove(status: string | undefined) {
  const value = status?.toLowerCase();
  if (value === "approved" || value === "live") {
    return apiError("forbidden", "Media cannot be approved from the client.", 403);
  }
  if (value === "rejected" || value === "removed") {
    return apiError("forbidden", "Only staff can close media.", 403);
  }
  return null;
}

export function publicOrPendingError(status: MediaStatus) {
  if (isPublicMediaStatus(status)) return null;
  return apiError("media_pending", "This photo isn’t public.", 404);
}
