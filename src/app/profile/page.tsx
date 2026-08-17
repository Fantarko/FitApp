import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";
import { calculateXp, getLevelFromXp } from "@/lib/progression";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const [profileRes, sessionsRes, matchesRes, badgesRes, streakRes] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    supabase.from("pushup_sessions").select("rep_count").eq("user_id", user.id),
    supabase.from("vs_matches").select("winner_id, challenger_id, opponent_id").or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`).eq("status", "completed"),
    supabase.from("user_badges").select("badges(code, icon, name_th)").eq("user_id", user.id),
    supabase.rpc("get_current_streak", { p_user_id: user.id }),
  ]);

  const sessions = sessionsRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const wins = matches.filter((m) => m.winner_id === user.id).length;
  const losses = matches.filter((m) => m.winner_id && m.winner_id !== user.id).length;
  const badges = (badgesRes.data ?? []).map((x) => x.badges).filter(Boolean) as unknown as { code: string; icon: string; name_th: string }[];
  const reps = sessions.reduce((sum, s) => sum + (s.rep_count ?? 0), 0);
  const xp = calculateXp({ reps, sessions: sessions.length, wins, badges: badges.length, streak: streakRes.data ?? 0 });
  const level = getLevelFromXp(xp);

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-10 md:px-10">
      <BlobBackground colors={["var(--color-primary)", "var(--color-plum)"]} />
      <div className="mx-auto max-w-3xl">
        <FadeIn className="glass rounded-[28px] p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-5">
            {profileRes.data?.avatar_url ? <img src={profileRes.data.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-tint text-3xl">👤</div>}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink/45">โปรไฟล์</p>
              <h1 className="truncate font-display text-3xl font-bold text-primary-deep">{profileRes.data?.display_name ?? "นักวิดพื้น"}</h1>
              <p className="mt-1 text-sm text-ink/50">Level {level.level} · {xp.toLocaleString()} XP</p>
            </div>
            <Link href="/stats" className="rounded-xl bg-black/5 px-4 py-2 text-sm font-medium transition hover:bg-black/10">ดูรายงาน</Link>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-ink/50"><span>Level {level.level}</span><span>{Math.max(0, xp - level.currentLevelXp).toLocaleString()} / {(level.nextLevelXp - level.currentLevelXp).toLocaleString()} XP</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${level.progress}%` }} /></div>
          </div>
        </FadeIn>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[["💪", reps, "ครั้งทั้งหมด"], ["🔥", streakRes.data ?? 0, "วันสตรีค"], ["⚔️", wins, "ชนะ VS"], ["🏆", badges.length, "Badge"]].map(([icon, value, label]) => <FadeIn key={String(label)} className="glass rounded-[20px] p-5 text-center"><div className="text-xl">{icon}</div><p className="mt-2 font-display text-2xl font-bold text-primary-deep">{Number(value).toLocaleString()}</p><p className="text-xs text-ink/50">{label}</p></FadeIn>)}
        </div>

        <FadeIn delay={0.1} className="glass mt-6 rounded-[24px] p-5">
          <div className="flex items-center justify-between"><h2 className="font-display font-semibold">🏅 Badges ของฉัน</h2><Link href="/achievements" className="text-sm text-primary-deep underline underline-offset-4">ดูทั้งหมด</Link></div>
          {badges.length ? <div className="mt-4 flex flex-wrap gap-2">{badges.map((b) => <span key={b.code} className="rounded-full bg-sun/15 px-3 py-2 text-sm">{b.icon} {b.name_th}</span>)}</div> : <p className="mt-3 text-sm text-ink/45">ยังไม่มี Badge ลองทำ Daily Challenge หรือทำสถิติใหม่ดู</p>}
        </FadeIn>

        <FadeIn delay={0.15} className="mt-6 flex flex-wrap gap-3">
          <Link href="/history" className="rounded-2xl bg-white/70 px-5 py-3 text-sm font-medium shadow-sm transition hover:-translate-y-0.5">ประวัติการวิดพื้น →</Link>
          <Link href="/leaderboard" className="rounded-2xl bg-plum px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5">Leaderboard →</Link>
        </FadeIn>
        <p className="mt-4 text-xs leading-5 text-ink/40">XP คำนวณจากข้อมูลการเล่นที่มีอยู่แล้วในระบบ จึงไม่ต้องเพิ่มตารางใหม่ในฐานข้อมูล</p>
      </div>
    </main>
  );
}
