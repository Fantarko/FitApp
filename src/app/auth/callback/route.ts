import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const consent = searchParams.get("consent");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (consent === "1" && data.user) {
        // record PDPA consent at the moment it was actually given, not retroactively
        await supabase
          .from("profiles")
          .update({ pdpa_consented_at: new Date().toISOString() })
          .eq("id", data.user.id)
          .is("pdpa_consented_at", null);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
