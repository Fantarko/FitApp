import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import GlassButton from "@/components/ui/GlassButton";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName = "";
  let avatarUrl = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? user.email ?? "";
    avatarUrl = profile?.avatar_url ?? "";
  }

  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-10">
      <Link href="/" className="font-display text-xl font-bold text-primary-deep">
        FitGreen
      </Link>

      {user ? (
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full border border-white/60"
              />
            ) : null}
            <span className="text-sm font-medium text-ink/80">{displayName}</span>
          </div>
          <form action={signOut}>
            <GlassButton variant="ghost" type="submit">
              ออกจากระบบ
            </GlassButton>
          </form>
        </div>
      ) : (
        <Link href="/login">
          <GlassButton variant="ghost">เข้าสู่ระบบ</GlassButton>
        </Link>
      )}
    </header>
  );
}
