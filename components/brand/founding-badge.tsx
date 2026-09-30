export function FoundingBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-gold/60 px-2.5 py-1 text-[11px] tracking-[0.14em] text-gold uppercase ${className}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-gold" />
      Founding member
    </span>
  );
}
