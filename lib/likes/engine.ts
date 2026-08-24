export type LikeKind = "pass" | "like" | "spotlight";

export type LikeRow = {
  actorId: string;
  profileId: string;
  kind: LikeKind;
};

export type MatchRow = {
  id: string;
  accountA: string;
  accountB: string;
  profileId: string;
  conversationId: string;
  createdAt: string;
};

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function applyLike(input: {
  actorId: string;
  actorProfileId?: string | null;
  targetProfileId: string;
  targetAccountId: string;
  kind: LikeKind;
  inbound?: boolean;
  likes: LikeRow[];
  matches: MatchRow[];
  now?: string;
  ids?: { matchId: string; conversationId: string };
}): {
  likes: LikeRow[];
  matches: MatchRow[];
  matched: boolean;
  isNew: boolean;
  match: MatchRow | null;
} {
  if (input.actorId === input.targetAccountId) {
    return {
      likes: input.likes,
      matches: input.matches,
      matched: false,
      isNew: false,
      match: null,
    };
  }

  const likes = [
    ...input.likes.filter(
      (row) => !(row.actorId === input.actorId && row.profileId === input.targetProfileId),
    ),
    { actorId: input.actorId, profileId: input.targetProfileId, kind: input.kind },
  ];

  if (input.kind === "pass") {
    return { likes, matches: input.matches, matched: false, isNew: false, match: null };
  }

  const reverse = Boolean(
    input.actorProfileId &&
      likes.some(
        (row) =>
          row.actorId === input.targetAccountId &&
          row.profileId === input.actorProfileId &&
          row.kind !== "pass",
      ),
  );
  const mutual = reverse || input.inbound === true;
  if (!mutual) {
    return { likes, matches: input.matches, matched: false, isNew: false, match: null };
  }

  const [accountA, accountB] = orderedPair(input.actorId, input.targetAccountId);
  const existing = input.matches.find((row) => row.accountA === accountA && row.accountB === accountB);
  if (existing) {
    return { likes, matches: input.matches, matched: true, isNew: false, match: existing };
  }

  const createdAt = input.now ?? new Date().toISOString();
  const match: MatchRow = {
    id: input.ids?.matchId ?? crypto.randomUUID(),
    accountA,
    accountB,
    profileId: input.targetProfileId,
    conversationId: input.ids?.conversationId ?? crypto.randomUUID(),
    createdAt,
  };

  return {
    likes,
    matches: [...input.matches, match],
    matched: true,
    isNew: true,
    match,
  };
}
