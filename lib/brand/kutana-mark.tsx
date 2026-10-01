/**
 * The Kutana mark: a chat bubble (people talking, meeting) with a bold K cut into it.
 * Plain SVG so it works in the app and in generated icons (next/og).
 */
export const BUBBLE =
  "M26 8 H74 Q92 8 92 26 V66 Q92 84 74 84 H40 L16 97 L22 83 Q8 80 8 66 V26 Q8 8 26 8 Z";
export const K_PARTS = ["28,22 41,22 41,42 58,22 74,22 53,46 75,70 59,70 41,51 41,70 28,70"];

export function KutanaMark({
  size = 24,
  bubble = "#d4b56a",
  letter = "#070708",
  className,
}: {
  size?: number;
  bubble?: string;
  letter?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d={BUBBLE} fill={bubble} />
      {K_PARTS.map((points) => (
        <polygon key={points} points={points} fill={letter} />
      ))}
    </svg>
  );
}
