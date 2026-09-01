export type Presence = "active" | "recent" | "offline";

export type Verification = {
  phone: boolean;
  identity: boolean;
  profile: boolean;
  established: boolean;
};

export type ProfileGender = "man" | "woman";

export type SeedProfile = {
  id: string;
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
  availability?: string;
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
