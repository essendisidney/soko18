/**
 * Data saver, on this device only. Auto-on when the phone asks to save data or the connection is
 * 2G/3G. Photos in grids wait for a tap, and a local counter shows roughly what Kutana used today.
 */

export const SAVER_KEY = "kutana_data_saver";
export const USAGE_KEY = "kutana_data_used";
export type SaverChoice = "auto" | "on" | "off";

type ConnectionLike = { saveData?: boolean; effectiveType?: string } | undefined;

/** What "auto" means for this connection. */
export function autoSaver(connection: ConnectionLike) {
  if (!connection) return false;
  return Boolean(connection.saveData) || ["slow-2g", "2g", "3g"].includes(connection.effectiveType ?? "");
}

export function readSaverChoice(): SaverChoice {
  try {
    const value = localStorage.getItem(SAVER_KEY);
    return value === "on" || value === "off" ? value : "auto";
  } catch {
    return "auto";
  }
}

export function saverOn(choice: SaverChoice, connection: ConnectionLike) {
  return choice === "on" || (choice === "auto" && autoSaver(connection));
}

export function writeSaverChoice(choice: SaverChoice) {
  try {
    if (choice === "auto") localStorage.removeItem(SAVER_KEY);
    else localStorage.setItem(SAVER_KEY, choice);
  } catch {}
  window.dispatchEvent(new Event("kutana-data-saver"));
}

export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Adds bytes to today's total; a new day starts from zero. */
export function addUsage(stored: string | null, bytes: number, day: string) {
  let current = { day, bytes: 0 };
  try {
    const parsed = stored ? (JSON.parse(stored) as { day: string; bytes: number }) : null;
    if (parsed && parsed.day === day && Number.isFinite(parsed.bytes)) current = parsed;
  } catch {}
  return { day, bytes: current.bytes + Math.max(0, bytes) };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
