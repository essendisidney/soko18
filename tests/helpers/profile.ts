import type { SeedProfile } from "@/lib/types";

export function testProfile(overrides: Partial<SeedProfile> = {}): SeedProfile {
  return {
    id: "t1",
    slug: "test-nairobi",
    name: "Test",
    age: 24,
    city: "Nairobi",
    citySlug: "nairobi",
    area: "Kilimani",
    areaSlug: "kilimani",
    verified: true,
    presence: "active",
    bio: "Kilimani evenings.",
    photos: ["https://images.unsplash.com/photo-test"],
    verification: { phone: true, identity: true, profile: true, established: true },
    views: 10,
    likes: 1,
    indexPublic: false,
    ...overrides,
  };
}
