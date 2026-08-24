export default function StudioSection({
  title,
}: {
  title: string;
}) {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Studio</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted">Wires to live data in later phases.</p>
    </main>
  );
}
