import { cn } from "@/lib/utils";
import { KutanaMark } from "@/lib/brand/kutana-mark";

/** KUTANA: heavy condensed capitals, slanted like a street poster, beside the bubble-K mark. */
export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text = size === "lg" ? "text-6xl" : size === "sm" ? "text-[22px]" : "text-[28px]";
  const mark = size === "lg" ? 52 : size === "sm" ? 20 : 26;

  return (
    <span className={cn("inline-flex items-center gap-2 leading-none", className)} aria-label="Kutana">
      <KutanaMark size={mark} className="shrink-0" />
      <span className={cn("font-brand font-black uppercase tracking-[0.01em] text-cream [transform:skewX(-8deg)]", text)}>
        Kutana
      </span>
    </span>
  );
}
