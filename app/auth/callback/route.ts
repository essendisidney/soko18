import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { INVITE_COOKIE, normalizePass } from "@/lib/growth/referral";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      // Came in through a friend's invite link: link the two accounts now.
      const invite = normalizePass(request.cookies.get(INVITE_COOKIE)?.value ?? "");
      if (invite.length >= 4) {
        await supabase.rpc("claim_invite", { p_code: invite }).then(
          () => undefined,
          () => undefined,
        );
        response.cookies.set(INVITE_COOKIE, "", { path: "/", maxAge: 0 });
      }
      return response;
    }
  }

  const login = new URL("/login", origin);
  login.searchParams.set("next", next);
  login.searchParams.set("error", "auth");
  return NextResponse.redirect(login);
}
