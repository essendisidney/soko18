"use client";

import { useEffect, useState } from "react";
import { canUnmask, unmaskLine } from "@/lib/trust/both-sides";
import { readIdentityState } from "@/lib/trust/identity-local";

export function UnmaskLine({ themIdentity }: { themIdentity: boolean }) {
  const [line, setLine] = useState(unmaskLine(themIdentity, "none"));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const you = readIdentityState();
    setLine(unmaskLine(themIdentity, you));
    setOpen(canUnmask(themIdentity, you));
  }, [themIdentity]);

  return <p className={open ? "text-xs text-gold" : "text-xs text-muted"}>{line}</p>;
}
