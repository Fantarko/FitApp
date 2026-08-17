import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import GlassButton from "@/components/ui/GlassButton";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let displayName = "";
  let avatarUrl = "";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single();
    displayName = profile?.display_name ?? user.email ?? "";
    avatarUrl = profile?.avatar_url ?? "";
  }
  return <header className="flex items-center justify-between gap-4 px-6 py-5 md:px-10"><Link href="/" className="shrink-0 font-display text-xl font-bold text-primary-deep">FitGreen</Link>{user ? <><nav className="hidden items-center gap-1 rounded-full bg-white/45 p-1 backdrop-blur md:flex"><Link href="/pushup" className="rounded-full px-3 py-2 text-xs font-medium text-ink/65 transition hover:bg-white/70 hover:text-primary-deep">วิดพื้น</Link><Link href="/vs" className="rounded-full px-3 py-2 text-xs font-medium text-ink/65 transition hover:bg-white/70 hover:text-primary-deep">VS</Link><Link href="/stats" className="rounded-full px-3 py-2 text-xs font-medium text-ink/65 transition hover:bg-white/70 hover:text-primary-deep">สถิติ</Link><Link href="/leaderboard" className="rounded-full px-3 py-2 text-xs font-medium text-ink/65 transition hover:bg-white/70 hover:text-primary-deep">อันดับ</Link><Link href="/friends" className="rounded-full px-3 py-2 text-xs font-medium text-ink/65 transition hover:bg-white/70 hover:text-primary-deep">เพื่อน</Link></nav><div className="flex items-center gap-2"><Link href="/profile" className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-white/50">{avatarUrl ? <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full border border-white/60 object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-sm">👤</span>}<span className="hidden max-w-28 truncate text-sm font-medium text-ink/80 sm:block">{displayName}</span></Link><form action={signOut}><GlassButton variant="ghost" type="submit" className="hidden sm:inline-flex">ออกจากระบบ</GlassButton></form></div></> : <Link href="/login"><GlassButton variant="ghost">เข้าสู่ระบบ</GlassButton></Link>}</header>;
}
