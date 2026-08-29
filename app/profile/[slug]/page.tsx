import { notFound } from "next/navigation";
import { getLiveProfile } from "@/lib/profile/live";
import { hasMatch } from "@/lib/likes/list";
import { PublicProfile } from "@/components/profile/public-profile";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getLiveProfile(slug);
  if (!profile) notFound();
  const matched = await hasMatch(slug);
  return <PublicProfile profile={profile} matched={matched} />;
}
