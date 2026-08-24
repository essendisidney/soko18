export const OWNER_PROFILE_STATUSES = ["draft", "pending_review", "paused"] as const;

export type OwnerProfileStatus = (typeof OWNER_PROFILE_STATUSES)[number];

export type ProfileDraft = {
  id: string;
  slug: string;
  displayName: string;
  birthYear: number | null;
  citySlug: "nairobi";
  areaSlug: string;
  bio: string;
  availability: string;
  indexPublic: boolean;
  status: OwnerProfileStatus;
  updatedAt: string;
};

export type ApiError = {
  error: { code: string; message: string };
};
