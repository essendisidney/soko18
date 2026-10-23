/** Voice intros: short, small, and safe to use in the browser. */

export const VOICE_MAX_MS = 15_000;
/** Opus at ~24 kbps mono keeps a 15-second clip around 50 KB. */
export const VOICE_BITS_PER_SECOND = 24_000;

export type VoiceStatus = "pending" | "approved" | "rejected";
export type MyVoice = { status: VoiceStatus; durationMs: number; path: string } | null;

/** The best format this browser can record: Opus first, AAC for Safari. Null if it can't record. */
export function pickVoiceFormat(isSupported: (mime: string) => boolean) {
  const options = [
    { mime: "audio/webm;codecs=opus", contentType: "audio/webm", ext: "webm" },
    { mime: "audio/ogg;codecs=opus", contentType: "audio/ogg", ext: "ogg" },
    { mime: "audio/mp4", contentType: "audio/mp4", ext: "m4a" },
  ] as const;
  return options.find((o) => isSupported(o.mime)) ?? null;
}

/** "0:07" for a 7-second clip. */
export function clipLength(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `0:${String(Math.min(seconds, 59)).padStart(2, "0")}`;
}
