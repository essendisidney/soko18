"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/soko/button";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribe() {
  return () => {};
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone))
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

export function InstallHome() {
  const standalone = useSyncExternalStore(subscribe, isStandalone, () => true);
  const ios = useSyncExternalStore(subscribe, isIos, () => false);
  const [install, setInstall] = useState<InstallEvent | null>(null);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setInstall(event as InstallEvent);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return null;

  async function addToHome() {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  }

  return (
    <div className="mt-6 rounded-3xl border border-line bg-glass px-5 py-4">
      <p className="font-medium">On your phone</p>
      {install ? (
        <>
          <p className="mt-1 text-sm text-muted">Add SOKO18 to the home screen.</p>
          <Button className="mt-4 w-full" variant="gold" onClick={() => void addToHome()}>
            Add to Home Screen
          </Button>
        </>
      ) : ios ? (
        <p className="mt-1 text-sm text-muted">Share, then Add to Home Screen.</p>
      ) : (
        <p className="mt-1 text-sm text-muted">Browser menu, then Add to Home Screen.</p>
      )}
    </div>
  );
}
