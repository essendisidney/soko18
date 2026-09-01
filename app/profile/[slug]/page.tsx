import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLiveProfile } from "@/lib/profile/live";
import { profileJsonLd, profileMetadata } from "@/lib/profile/seo";
import { hasMatch } from "@/lib/likes/list";
import { PublicProfile } from "@/components/profile/public-profile";
import { JsonLd } from "@/components/seo/json-ld";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = getLiveProfile(slug);
  if (!profile) return { title: "Profile", robots: { index: false, follow: false } };
  return profileMetadata(profile);
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = getLiveProfile(slug);
  if (!profile) notFound();
  const matched = await hasMatch(slug);
  const jsonLd = profileJsonLd(profile);
  return (
    <>
      <JsonLd data={jsonLd} />
      <PublicProfile profile={profile} matched={matched} />
    </>
  );
}
