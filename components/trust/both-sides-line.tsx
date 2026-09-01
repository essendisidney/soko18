"use client";

import { useEffect, useState } from "react";
import { bothSidesLine } from "@/lib/trust/both-sides";
import { readIdentityState } from "@/lib/trust/identity-local";

export function BothSidesLine({ themIdentity }: { themIdentity: boolean }) {
  const [line, setLine] = useState(bothSidesLine(themIdentity, "none"));

  useEffect(() => {
    setLine(bothSidesLine(themIdentity, readIdentityState()));
  }, [themIdentity]);

  return <p className="text-xs text-muted">{line}</p>;
}
