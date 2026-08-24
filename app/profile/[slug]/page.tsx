import { notFound } from "next/navigation";
import { getLiveProfile } from "@/lib/profile/live";
import { PublicProfile } from "@/components/profile/public-profile";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getLiveProfile(slug);
  if (!profile) notFound();
  return <PublicProfile profile={profile} />;
}
