import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { INVITE_COOKIE, normalizePass } from "@/lib/growth/referral";

const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "recovery", "invite", "email_change"];

/**
 * Email links land here with a token_hash. Unlike the code exchange in /auth/callback,
 * this works when the email app opens the link in a different browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const rawType = (searchParams.get("type") ?? "email") as EmailOtpType;
  const type = TYPES.includes(rawType) ? rawType : "email";
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
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
