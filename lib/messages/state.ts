import { cookies } from "next/headers";
import type { BlockRow, ThreadMessage } from "@/lib/messages/engine";

export const THREAD_STATE_COOKIE = "soko18_thread_state";

export type ThreadState = {
  actorId: string;
  messages: ThreadMessage[];
  blocks: BlockRow[];
  reports: { id: string; conversationId: string; reason: string; createdAt: string }[];
};

export async function readThreadState(actorId: string): Promise<ThreadState> {
  const store = await cookies();
  const raw = store.get(THREAD_STATE_COOKIE)?.value;
  if (!raw) return { actorId, messages: [], blocks: [], reports: [] };
  try {
    const parsed = JSON.parse(raw) as ThreadState;
    if (parsed.actorId !== actorId) return { actorId, messages: [], blocks: [], reports: [] };
    return {
      actorId,
      messages: parsed.messages ?? [],
      blocks: parsed.blocks ?? [],
      reports: parsed.reports ?? [],
    };
  } catch {
    return { actorId, messages: [], blocks: [], reports: [] };
  }
}

export async function writeThreadState(state: ThreadState) {
  const store = await cookies();
  store.set(
    THREAD_STATE_COOKIE,
    JSON.stringify({
      ...state,
      messages: state.messages.slice(-80),
      reports: state.reports.slice(-20),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  );
}
