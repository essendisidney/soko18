import Link from "next/link";

export default function AdminSection({ title, line }: { title: string; line: string }) {
  return (
    <main className="min-h-dvh bg-bg px-5 py-6 text-cream md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Admin</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted">{line}</p>
      <Link href="/admin" className="mt-8 inline-block text-sm text-muted">
        Back to overview
      </Link>
    </main>
  );
}
