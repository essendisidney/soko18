import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  className?: string;
}) {
  const up = delta?.startsWith("↑");
  return (
    <div className={cn("glass rounded-3xl p-4", className)}>
      <p className="text-[11px] tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="mt-3 font-display text-3xl tracking-tight">{value}</p>
      {delta ? (
        <p className={cn("mt-1 text-sm", up ? "text-live" : "text-muted")}>{delta}</p>
      ) : null}
    </div>
  );
}
