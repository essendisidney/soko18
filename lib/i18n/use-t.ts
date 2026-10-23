"use client";

import { useSyncExternalStore } from "react";
import { LOCALES, translate, type Locale, type MessageKey } from "@/lib/i18n/messages";

const KEY = "soko18_lang";
const listeners = new Set<() => void>();

function isLocale(value: string | null): value is Locale {
  return LOCALES.some((l) => l.id === value);
}

/** Saved choice, else the phone's language (sw / fr), else English. */
export function readLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(KEY);
    if (isLocale(saved)) return saved;
  } catch {}
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("pcm")) return "pcm";
  const short = nav.slice(0, 2);
  return isLocale(short) ? short : "en";
}

export function writeLocale(locale: Locale) {
  try {
    localStorage.setItem(KEY, locale);
  } catch {}
  document.cookie = `${KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = LOCALES.find((l) => l.id === locale)?.lang ?? locale;
  listeners.forEach((listen) => listen());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, readLocale, () => "en");
}

export function useT() {
  const locale = useLocale();
  return (key: MessageKey) => translate(locale, key);
}
