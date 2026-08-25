import Link from "next/link";

export default function StudioSection({
  title,
}: {
  title: string;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Studio</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted">
        Account privacy is in Settings. Public indexing is on your profile.
      </p>
      <div className="mt-8 flex flex-col gap-3 text-sm">
        <Link href="/settings" className="text-cream">
          Settings
        </Link>
        <Link href="/studio/profile" className="text-cream">
          Profile
        </Link>
        <Link href="/studio" className="text-muted">
          Back to studio
        </Link>
      </div>
    </div>
  );
}
