"use client";

import { useMounted } from "@/lib/use-mounted";
import { canUnmask, unmaskLine } from "@/lib/trust/both-sides";
import { readIdentityState } from "@/lib/trust/identity-local";

export function UnmaskLine({ themIdentity }: { themIdentity: boolean }) {
  const mounted = useMounted();
  const you = mounted ? readIdentityState() : "none";
  const line = unmaskLine(themIdentity, you);
  const open = mounted && canUnmask(themIdentity, you);

  return <p className={open ? "text-xs text-gold" : "text-xs text-muted"}>{line}</p>;
}
