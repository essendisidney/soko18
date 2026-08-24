export const MEDIA_STATUSES = [
  "uploaded",
  "scanning",
  "pending_review",
  "approved",
  "rejected",
  "replaced",
  "removed",
] as const;

export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const OWNER_MEDIA_STATUSES = ["uploaded", "scanning", "pending_review"] as const;

export type ModerationDecision = "approve" | "reject" | "request_replacement";

export type MediaItem = {
  id: string;
  profileId: string;
  profileName: string;
  area: string;
  path: string;
  status: MediaStatus;
  isCover: boolean;
  sortOrder: number;
  fileName: string;
  flagged: boolean;
  createdAt: string;
};

export type ModerationLog = {
  id: string;
  mediaId: string;
  decision: ModerationDecision;
  note: string;
  at: string;
};

export function isPublicMediaStatus(status: MediaStatus) {
  return status === "approved";
}
