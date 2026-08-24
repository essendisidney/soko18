import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin/staff";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();
  if (!staff.ok) notFound();
  return <>{children}</>;
}
