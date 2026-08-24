export function HealthBar({ score }: { score: number }) {
  const width = Math.min(100, Math.max(0, score));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-gold" style={{ width: `${width}%` }} />
    </div>
  );
}
