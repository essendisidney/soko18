"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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
    <p className="mt-4 text-xs leading-relaxed text-muted">
      {install ? (
        <button type="button" className="text-cream/80" onClick={() => void addToHome()}>
          Add to Home Screen
        </button>
      ) : ios ? (
        "Share, then Add to Home Screen."
      ) : (
        "On a phone, Add to Home Screen from the browser menu."
      )}
    </p>
  );
}
