"use client";

import { useEffect } from "react";
import { ONBOARDING } from "@/lib/onboarding";

export function RememberArea({ slug }: { slug: string }) {
  useEffect(() => {
    localStorage.setItem(ONBOARDING.nearArea, slug);
  }, [slug]);
  return null;
}
