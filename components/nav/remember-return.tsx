"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const RETURN_KEY = "soko18_return";

export function RememberReturn() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/profile/") || pathname.startsWith("/messages/")) return;
    sessionStorage.setItem(RETURN_KEY, pathname);
  }, [pathname]);

  return null;
}
