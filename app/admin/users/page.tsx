import Link from "next/link";
import { listAdminUsers } from "@/lib/admin/users";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const result = await listAdminUsers();
  const items = result.ok ? result.data.items : [];

  return (
    <main className="min-h-dvh bg-bg px-5 py-6 text-cream md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Admin</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Users</h1>
      <p className="mt-2 text-sm text-muted">Staff view. Roles come from accounts, not profile copy.</p>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No accounts yet.</p>
      ) : (
        <ul className="mt-8 max-w-2xl space-y-2">
          {items.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm">
              <span>{row.name}</span>
              <span className="text-muted">
                {row.role}
                {row.banned ? " · banned" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/admin" className="mt-8 inline-block text-sm text-muted">
        Back to overview
      </Link>
    </main>
  );
}
