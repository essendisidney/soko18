import type { ReactElement } from "react";
import { KutanaMark } from "@/lib/brand/kutana-mark";

/**
 * App icon: the Kutana bubble-K in gold on night black. No name, no "18":
 * a dating app's home-screen icon should be discreet.
 * Drawn inside the maskable safe zone (centre ~62%).
 */
export function appMark(size: number): ReactElement {
  const mark = Math.round(size * 0.62);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070708",
      }}
    >
      <KutanaMark size={mark} />
    </div>
  );
}
