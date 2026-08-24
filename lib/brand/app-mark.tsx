import type { ReactElement } from "react";

export function appMark(size: number): ReactElement {
  const fontSize = Math.round(size * 0.42);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070708",
        color: "#d4b56a",
        fontSize,
        fontWeight: 800,
        letterSpacing: "-0.08em",
      }}
    >
      18
    </div>
  );
}
