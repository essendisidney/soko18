"use client";

import Link from "next/link";
import { useState } from "react";

export default function SettingsPage() {
  const [indexPublic, setIndexPublic] = useState(true);
  const [hideSeen, setHideSeen] = useState(false);

  return (
    <div>
      <h1 className="font-display text-[34px] tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-muted">Privacy is part of the product.</p>
      <div className="mt-8 space-y-3 text-sm">
        <button
          type="button"
          onClick={() => setHideSeen((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left"
        >
          Hide last seen
          <span className="text-muted">{hideSeen ? "On" : "Off"}</span>
        </button>
        <button
          type="button"
          onClick={() => setIndexPublic((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left"
        >
          Allow public search indexing
          <span className="text-muted">{indexPublic ? "On" : "Off"}</span>
        </button>
        <div className="rounded-2xl border border-line bg-glass px-5 py-4">Restrict messages</div>
        <div className="rounded-2xl border border-line bg-glass px-5 py-4">Download my data</div>
        <div className="rounded-2xl border border-line bg-glass px-5 py-4 text-danger">Delete account</div>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Location is shown at area level only (Kilimani, Westlands). SOKO18 never shows a live pin.
      </p>
      <Link href="/me" className="mt-8 inline-block text-sm text-muted">
        Back
      </Link>
    </div>
  );
}
