import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Small numbers for the tab bar: people who like you, and unread chat messages. */
export async function GET() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return NextResponse.json({ data: { likes: 0, chats: 0 } });
  const supabase = await createClient();
  const [liked, unread] = await Promise.all([
    supabase.rpc("liked_me"),
    // RLS limits messages to the member's own conversations.
    supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", user.id),
  ]);
  const likes = Number((liked.data as { count?: number } | null)?.count ?? 0);
  return NextResponse.json(
    { data: { likes, chats: unread.count ?? 0 } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
