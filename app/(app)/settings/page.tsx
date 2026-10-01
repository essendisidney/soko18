"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/soko/button";
import { DiscretionTools } from "@/components/privacy/discretion-tools";
import { TwoStep } from "@/components/auth/two-step";
import { PushToggle } from "@/components/pwa/push-toggle";
import { LanguagePicker } from "@/components/i18n/language-picker";
import { CountryPicker } from "@/components/markets/country-picker";
import { ConsentSettings } from "@/components/privacy/consent-settings";
import { exportToHtml } from "@/lib/account/export-html";

export default function SettingsPage() {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function exportData(format: "page" | "json" = "page") {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/account/export", { method: "POST" });
    const json = (await res.json().catch(() => null)) as { data?: Record<string, unknown>; error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok || !json?.data) {
      setNote(json?.error?.message ?? "Sign in to download your data.");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const blob =
      format === "json"
        ? new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" })
        : new Blob([exportToHtml(json.data)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "json" ? `soko-my-data-${stamp}.json` : `soko-my-data-${stamp}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setNote(format === "json" ? "Download started." : "Downloaded. Open it to read your data, or save it as a PDF.");
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
      <div className="mt-8 space-y-3 text-sm">
        <button
          type="button"
          disabled={busy}
          onClick={() => void exportData("page")}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left"
        >
          Download my data
          <span className="text-muted">Readable page · PDF</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void exportData("json")}
          className="block w-full px-5 text-left text-xs text-muted underline-offset-2 hover:underline"
        >
          Need it for another app? Download as JSON
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
      <DiscretionTools />
      <LanguagePicker />
      <CountryPicker />
      <PushToggle />
      <TwoStep />
      <ConsentSettings />
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Location is shown at area level only (Kilimani, Nyali, Milimani). Kutana never shows a live pin.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Public search indexing lives on your profile in Studio. It is off until you turn it on.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/safety">Safety</Link>
      </div>
      <Link href="/discover" className="mt-8 block">
        <Button variant="gold" className="w-full">
          Discover
        </Button>
      </Link>
      <Link href="/me" className="mt-6 inline-block text-sm text-muted">
        Back
      </Link>
    </div>
  );
}
