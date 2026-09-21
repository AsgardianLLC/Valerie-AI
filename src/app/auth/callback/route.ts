import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase sends the user here after Google OAuth (or an email magic
 * link) with a `?code=` param. Exchanging it for a session sets the
 * auth cookies, then we bounce back to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No page dedicated to this yet - bounce home with an error flag that
  // page.tsx (or a toast you add later) can key off of.
  return NextResponse.redirect(`${origin}/?authError=true`);
}
