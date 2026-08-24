"use server";

import { saveProfile } from "@/lib/profile/save";

export async function saveProfileAction(input: unknown) {
  return saveProfile(input);
}
