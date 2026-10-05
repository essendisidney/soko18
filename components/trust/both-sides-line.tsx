"use client";

import { useMounted } from "@/lib/use-mounted";
import { bothSidesLine } from "@/lib/trust/both-sides";
import { readIdentityState } from "@/lib/trust/identity-local";

export function BothSidesLine({ themIdentity }: { themIdentity: boolean }) {
  const line = bothSidesLine(themIdentity, useMounted() ? readIdentityState() : "none");

  return <p className="text-xs text-muted">{line}</p>;
}
