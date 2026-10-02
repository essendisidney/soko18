"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { refreshMyProfile } from "@/lib/profile/sync";

/** Keeps "my profile" in step with the server: on open, and whenever the app comes back to the front. */
export function ProfileSync() {
  const { user, ready } = useAuth();
  useEffect(() => {
    if (!ready || !user) return;
    void refreshMyProfile();
    const onShow = () => {
      if (document.visibilityState === "visible") void refreshMyProfile();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [ready, user]);
  return null;
}
