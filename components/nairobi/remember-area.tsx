"use client";

import { useEffect } from "react";
import { writeNearArea } from "@/lib/nairobi/near";

export function RememberArea({ slug }: { slug: string }) {
  useEffect(() => {
    writeNearArea(slug);
  }, [slug]);
  return null;
}
