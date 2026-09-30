"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import type { ConsentState } from "@/lib/account/consent-client";

/** Change optional consents any time (Kenya Data Protection Act: withdraw as easily as you gave). */
export function ConsentSettings() {
  const { user, configured } = useAuth();
  const [state, setState] = useState<ConsentState | null>(null);

  useEffect(() => {
    if (!configured || !user) return;
    void fetch("/api/consent")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: ConsentState } | null) => setState(json?.data ?? null));
  }, [configured, user]);

  if (!state) return null;

  async function toggle(kind: "sensitive_data" | "marketing", granted: boolean) {
    if (kind === "sensitive_data" && !granted) {
      const ok = window.confirm("Without this, we can’t use your gender or who you want to see, so matching will be less accurate. Continue?");
      if (!ok) return;
    }
    const res = await fetch("/api/consent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, granted }),
    });
    const json = (await res.json().catch(() => null)) as { data?: ConsentState } | null;
    if (json?.data) setState(json.data);
  }

  const row = (kind: "sensitive_data" | "marketing", label: string) => (
    <label className="mt-3 flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-1"
        checked={Boolean(state.consents[kind]?.granted)}
        onChange={(e) => void toggle(kind, e.target.checked)}
      />
      <span className="text-muted">{label}</span>
    </label>
  );

  return (
    <section className="mt-8">
      <h2 className="text-sm text-muted">Your data choices</h2>
      {row("sensitive_data", "Use my gender and who I want to see for matching")}
      {row("marketing", "Send me offers and news")}
    </section>
  );
}
