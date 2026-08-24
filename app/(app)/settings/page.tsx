"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [indexPublic, setIndexPublic] = useState(false);
  const [hideSeen, setHideSeen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/account/export", { method: "POST" });
    const json = (await res.json().catch(() => null)) as { data?: unknown; error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok) {
      setNote(json && "error" in json && json.error ? json.error.message : "Sign in to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(json?.data ?? {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "soko18-data.json";
    a.click();
    URL.revokeObjectURL(url);
    setNote("Download started.");
  }

  async function deleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setNote("Tap again to delete. This cannot be undone.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok) {
      setNote(json?.error?.message ?? "Sign in to delete.");
      return;
    }
    setNote("Account deleted. Sessions revoked.");
    router.push("/discover");
  }

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
        <button
          type="button"
          disabled={busy}
          onClick={() => void exportData()}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left"
        >
          Download my data
          <span className="text-muted">JSON</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void deleteAccount()}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left text-danger"
        >
          {confirmDelete ? "Confirm delete" : "Delete account"}
        </button>
      </div>
      {note ? <p className="mt-4 text-xs text-muted">{note}</p> : null}
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Location is shown at area level only (Kilimani, Westlands). SOKO18 never shows a live pin.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/safety">Safety</Link>
      </div>
      <Link href="/me" className="mt-8 inline-block text-sm text-muted">
        Back
      </Link>
    </div>
  );
}
