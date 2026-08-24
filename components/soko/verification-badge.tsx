import { cn } from "@/lib/utils";

export function VerificationBadge({
  label = "Verified",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium tracking-wide text-gold backdrop-blur-md",
        className,
      )}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <circle cx="6" cy="6" r="6" fill="currentColor" />
        <path
          d="M3.4 6.2 5.1 8l3.5-4.2"
          stroke="#111113"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}
