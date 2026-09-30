import { notFound } from "next/navigation";
import { ThreadShell } from "@/components/messages/thread-shell";
import { getProfile } from "@/lib/data/seed";
import { liveProfileBySlug, showSeedProfiles } from "@/lib/discovery/live";
import { loadThread } from "@/lib/messages/thread";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Real members first; demo people only where demo mode is on.
  const profile = (await liveProfileBySlug(id)) ?? (showSeedProfiles() ? getProfile(id) : null);
  if (!profile) notFound();
  const thread = await loadThread(id);
  return (
    <ThreadShell
      profile={profile}
      open={thread.open}
      conversationId={thread.conversationId}
      initialMessages={thread.messages}
      canSend={thread.canSend}
      blocked={thread.blocked}
      persisted={thread.persisted}
      actorId={thread.actorId}
    />
  );
}
