import Link from "next/link";
import Image from "next/image";
import { THREADS, getProfile } from "@/lib/data/seed";
import { PresenceDot } from "@/components/soko/presence-dot";
import { VerificationBadge } from "@/components/soko/verification-badge";

export default function MatchesPage() {
  const thread = THREADS[0];
  const profile = getProfile(thread.profileSlug);

  return (
    <div>
      <h1 className="font-display text-[34px] tracking-tight">Matches</h1>
      <p className="mt-1 text-sm text-muted">People you both liked.</p>

      {profile ? (
        <Link
          href={`/messages/${profile.slug}`}
          className="mt-8 flex items-center gap-4 rounded-3xl border border-line bg-glass p-3"
        >
          <div className="relative size-16 overflow-hidden rounded-2xl">
            <Image src={profile.photos[0]} alt={profile.name} fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{profile.name}</p>
              {profile.verified ? <VerificationBadge label="" className="px-1.5" /> : null}
            </div>
            <PresenceDot presence={profile.presence} className="mt-1 text-xs" />
            <p className="mt-1 truncate text-sm text-muted">{thread.messages.at(-1)?.body}</p>
          </div>
        </Link>
      ) : null}
    </div>
  );
}
