import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";

const rows = [
  { href: "/studio", label: "SOKO18 Studio" },
  { href: "/admin", label: "Admin" },
  { href: "/settings", label: "Settings" },
  { href: "/nairobi", label: "Nairobi" },
  { href: "/onboarding/city", label: "Other cities" },
];

export default function MePage() {
  return (
    <div>
      <Wordmark />
      <h1 className="mt-8 font-display text-[34px] tracking-tight">Me</h1>
      <p className="mt-2 text-sm text-muted">Account, safety, and business tools.</p>
      <div className="mt-8 overflow-hidden rounded-3xl border border-line">
        {rows.map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="flex items-center justify-between border-b border-line px-5 py-4 last:border-b-0"
          >
            {row.label}
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-xs leading-relaxed text-muted">
        SOKO18 is 18+. Report, block, and privacy controls are always available from a profile or thread.
      </p>
    </div>
  );
}
