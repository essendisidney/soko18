import { cn } from "@/lib/utils";
import type { Presence } from "@/lib/types";

const labels: Record<Presence, string> = {
  active: "Active",
  recent: "Active recently",
  offline: "Away",
};

export function PresenceDot({
  presence,
  withLabel = true,
  className,
}: {
  presence: Presence;
  withLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] text-cream/85", className)}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          presence === "active" && "bg-live",
          presence === "recent" && "bg-gold",
          presence === "offline" && "bg-muted",
        )}
      />
      {withLabel ? labels[presence] : null}
    </span>
  );
}
