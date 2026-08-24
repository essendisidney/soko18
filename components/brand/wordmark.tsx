import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const soko =
    size === "lg" ? "text-5xl" : size === "sm" ? "text-[17px]" : "text-xl";
  const mark =
    size === "lg" ? "text-2xl -mt-1" : size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <span className={cn("inline-flex items-start gap-0.5 leading-none", className)}>
      <span className={cn("font-display font-semibold tracking-[-0.04em] text-cream", soko)}>
        SOKO
      </span>
      <span className={cn("font-display font-bold text-gold tracking-tight", mark)}>18</span>
    </span>
  );
}
