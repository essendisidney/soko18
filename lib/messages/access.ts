import { currentUser } from "@/lib/auth/user";
import { listMatches, type MatchListItem } from "@/lib/likes/list";
import { canSendMessage, isBlockedPair, type BlockRow } from "@/lib/messages/engine";
import { readThreadState } from "@/lib/messages/state";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type ThreadAccess = {
  userId: string;
  item: MatchListItem;
  accountA: string;
  accountB: string;
  blocked: boolean;
  canSend: boolean;
  persisted: boolean;
};

export async function resolveThread(id: string): Promise<
  | { ok: true; access: ThreadAccess }
  | { ok: false; status: number; error: { code: string; message: string } }
> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, status: 401, error: { code: "unauthorized", message: "Sign in to message." } };
  }

  const matches = await listMatches();
  const item = matches.find(
    (row) => row.slug === id || row.id === id || row.conversationId === id || row.profileId === id,
  );
  if (!item) {
    return {
      ok: false,
      status: 404,
      error: { code: "not_found", message: "Conversation unavailable." },
    };
  }

  const seed = await readThreadState(user.id);
  let blocks: BlockRow[] = seed.blocks;
  let persisted = false;
  let accountA = user.id;
  let accountB = item.otherAccountId;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: convo } = await supabase
      .from("conversations")
      .select("id, match_id")
      .eq("id", item.conversationId)
      .maybeSingle();
    if (convo?.match_id) {
      persisted = true;
      const { data: match } = await supabase
        .from("matches")
        .select("account_a, account_b")
        .eq("id", convo.match_id)
        .maybeSingle();
      if (match) {
        accountA = match.account_a;
        accountB = match.account_b;
      }
      const { data: liveBlocks } = await supabase
        .from("blocks")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${item.otherAccountId}),and(blocker_id.eq.${item.otherAccountId},blocked_id.eq.${user.id})`,
        );
      blocks = [
        ...blocks,
        ...(liveBlocks ?? []).map((row) => ({ blockerId: row.blocker_id, blockedId: row.blocked_id })),
      ];
    }
  }

  const blocked = isBlockedPair(user.id, item.otherAccountId, blocks);
  return {
    ok: true,
    access: {
      userId: user.id,
      item,
      accountA,
      accountB,
      blocked,
      canSend: canSendMessage(user.id, accountA, accountB, blocks),
      persisted,
    },
  };
}
