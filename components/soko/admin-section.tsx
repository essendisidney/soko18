export default function AdminSection({ title }: { title: string }) {
  return (
    <main className="min-h-dvh bg-bg px-5 pt-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Admin</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted">Live data and authorization land in Phase 11.</p>
    </main>
  );
}
