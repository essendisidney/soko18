export type Presence = "active" | "recent" | "offline";

export type Verification = {
  phone: boolean;
  identity: boolean;
  profile: boolean;
  established: boolean;
};

export type ProfileGender = "man" | "woman" | "nonbinary";

export type LookingFor = "relationship" | "casual" | "friends" | "unsure";

export type SeedProfile = {
  id: string;
  /** A clearly labelled test person (removed before launch). */
  isTest?: boolean;
  slug: string;
  name: string;
  age: number;
  gender: ProfileGender;
  city: string;
  citySlug: string;
  area: string;
  areaSlug: string;
  verified: boolean;
  presence: Presence;
  bio: string;
  lookingFor?: LookingFor;
  prompts?: { q: string; a: string }[];
  photos: string[];
  verification: Verification;
  featured?: boolean;
  incognito?: boolean;
  newToday?: boolean;
  rising?: boolean;
  views: number;
  likes: number;
  indexPublic: boolean;
};

export type SeedMessage = {
  id: string;
  from: "them" | "me";
  body: string;
  at: string;
};

export type SeedThread = {
  id: string;
  profileSlug: string;
  messages: SeedMessage[];
};
