import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  selected,
  children,
  className,
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-4 py-2.5 text-sm transition-colors active:scale-[0.98]",
        selected
          ? "border-gold bg-gold/15 text-cream"
          : "border-line bg-glass text-cream/80 hover:bg-glass-strong",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
