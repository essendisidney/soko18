import type { ReactElement } from "react";
import { KutanaMark } from "@/lib/brand/kutana-mark";
import type { RaceRow } from "@/lib/campus/race";

export const RACE_IMAGE_SIZE = { width: 1200, height: 630 };

const GOLD = "#d4b56a";
const CREAM = "#f6f1e8";
const MUTED = "#8e887c";

function Frame({ children }: { children: ReactElement | ReactElement[] }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(135deg, #070708 0%, #15130e 100%)",
        color: CREAM,
        fontFamily: "sans-serif",
      }}
    >
      {children}
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <KutanaMark size={64} />
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: GOLD }}>CAMPUS RACE</div>
    </div>
  );
}

function Bar({ joined, target }: { joined: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.max(3, Math.round((joined / target) * 100))) : 100;
  return (
    <div style={{ display: "flex", width: "100%", height: 22, borderRadius: 11, background: "rgba(255,255,255,0.12)" }}>
      <div style={{ display: "flex", width: `${pct}%`, height: 22, borderRadius: 11, background: GOLD }} />
    </div>
  );
}

/** One campus: its real count and how many more it needs. */
export function campusRaceImage(row: RaceRow): ReactElement {
  return (
    <Frame>
      <Header />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800 }}>{row.shortName}</div>
        {row.status === "live" ? (
          <div style={{ display: "flex", fontSize: 48, color: GOLD }}>Open on Kutana ✓</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: GOLD }}>{row.joined}</div>
              <div style={{ display: "flex", fontSize: 40, color: MUTED }}>of {row.target} students</div>
              {row.joined > 0 ? (
                <div style={{ display: "flex", fontSize: 40, color: CREAM, marginLeft: "auto" }}>#{row.place}</div>
              ) : (
                <div style={{ display: "flex" }} />
              )}
            </div>
            <Bar joined={row.joined} target={row.target} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", fontSize: 30, color: MUTED }}>
        {row.status === "live"
          ? "Verified students only. 18+."
          : row.joined === 0
            ? `Be the first. Opens at ${row.target} verified students. 18+.`
            : `${row.toGo} more to open. Verify with your student email. 18+.`}
      </div>
    </Frame>
  );
}

/** The top of the race, for the general link. */
export function raceBoardImage(race: RaceRow[]): ReactElement {
  const top = race.slice(0, 4);
  return (
    <Frame>
      <Header />
      <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>Which campus opens first?</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {top.length === 0 ? (
          <div style={{ display: "flex", fontSize: 34, color: MUTED }}>Verify with your student email to start the race.</div>
        ) : (
          top.map((row) => (
            <div key={row.slug} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ display: "flex", width: 150, fontSize: 36, fontWeight: 700 }}>{row.shortName}</div>
              <div style={{ display: "flex", flex: 1 }}>
                <Bar joined={row.status === "live" ? row.target : row.joined} target={row.target} />
              </div>
              <div style={{ display: "flex", width: 200, justifyContent: "flex-end", fontSize: 30, color: row.status === "live" ? GOLD : MUTED }}>
                {row.status === "live" ? "Open" : `${row.joined} / ${row.target}`}
              </div>
            </div>
          ))
        )}
      </div>
    </Frame>
  );
}
