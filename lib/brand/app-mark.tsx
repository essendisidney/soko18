import type { ReactElement } from "react";

/**
 * App icon: two interlocking gold rings — two people meeting. No "18":
 * a dating app's home-screen icon should be discreet and mainstream.
 * Drawn inside the maskable safe zone (centre 60%).
 */
export function appMark(size: number): ReactElement {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#070708" }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="40" cy="50" r="19" fill="none" stroke="#d4b56a" strokeWidth="4.5" />
        <circle cx="60" cy="50" r="19" fill="none" stroke="#d4b56a" strokeWidth="4.5" />
        <path d="M50 33.9 A19 19 0 0 1 50 66.1 A19 19 0 0 1 50 33.9 Z" fill="#d4b56a" />
      </svg>
    </div>
  );
}
