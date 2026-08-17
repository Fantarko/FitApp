import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";
import { calculateXp, getLevelFromXp, getXpBreakdown } from "@/lib/progression";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const [profileRes, sessionsRes, matchesRes, badgesRes, streakRes, dailyRes, bossRes] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    supabase.from("pushup_sessions").select("rep_count").eq("user_id", user.id),
    supabase.from("vs_matches").select("winner_id, challenger_id, opponent_id, challenger_reps, opponent_reps").or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`).eq("status", "completed"),
    supabase.from("user_badges").select("badges(code, icon, name_th)").eq("user_id", user.id),
    supabase.rpc("get_current_streak", { p_user_id: user.id }),
    supabase.from("daily_challenge_progress").select("session_id").eq("user_id", user.id),
    supabase.from("user_boss_progress").select("boss_id, best_reps_used, defeated_at").eq("user_id", user.id),
    supabase.rpc("get_my_progress"),
  ]);

  const sessions = sessionsRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const wins = matches.filter((m) => m.winner_id === user.id).length;
  const draws = matches.filter((m) => !m.winner_id).length;
  const losses = matches.filter((m) => !!m.winner_id && m.winner_id !== user.id).length;
  const badges = (badgesRes.data ?? []).map((x) => x.badges).filter(Boolean) as unknown as { code: string; icon: string; name_th: string }[];
  const reps = sessions.reduce((sum, s) => sum + (s.rep_count ?? 0), 0);
  const bestRecord = sessions.reduce((best, s) => Math.max(best, s.rep_count ?? 0), 0);
  const bossWins = (bossRes.data ?? []).filter((b) => b.defeated_at).length;
  const dailyClears = dailyRes.data?.length ?? 0;
  const streak = streakRes.data ?? 0;
  const calculated = calculateXp({ reps, sessions: sessions.length, wins, draws, bossWins, dailyClears, badges: badges.length, streak });
  const serverProgress = progressRes.data as { xp:number; level:number; rating:number } | null;
  const xp = serverProgress?.xp ?? calculated;
  const level = serverProgress ? getLevelFromXp(serverProgress.xp) : getLevelFromXp(xp);
  const xpBreakdown = getXpBreakdown({ reps, sessions: sessions.length, wins, draws, bossWins, dailyClears, badges: badges.length, streak });
  const rating = serverProgress?.rating ?? Math.max(100, 1000 + wins * 20 - losses * 15 + draws * 5);
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-10 md:px-10">
      <BlobBackground colors={["var(--color-primary)", "var(--color-plum)"]} />
      <div className="mx-auto max-w-4xl">
        <FadeIn className="glass rounded-[28px] p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-5">
            {profileRes.data?.avatar_url ? <img src={profileRes.data.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-tint text-3xl font-display font-bold text-primary-deep">{(profileRes.data?.display_name ?? "?").charAt(0)}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink/45">โปรไฟล์นักกีฬา</p>
              <h1 className="truncate font-display text-3xl font-bold text-primary-deep">{profileRes.data?.display_name ?? "นักวิดพื้น"}</h1>
              <p className="mt-1 text-sm text-ink/50">Level {level.level} · {xp.toLocaleString()} XP</p>
            </div>
            <Link href="/stats" className="rounded-xl bg-black/5 px-4 py-2 text-sm font-medium transition hover:bg-black/10">ดูรายงาน</Link>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-xs text-ink/50"><span>Level {level.level}</span><span>{Math.max(0, xp - level.currentLevelXp).toLocaleString()} / {(level.nextLevelXp - level.currentLevelXp).toLocaleString()} XP</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${level.progress}%` }} /></div>
            <p className="mt-2 text-xs text-ink/40">อีก {(level.nextLevelXp - xp).toLocaleString()} XP ถึง Level {level.level + 1}</p>
          </div>
        </FadeIn>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[[reps, "Total Reps"], [bestRecord, "Best Record"], [streak, "Streak"], [rating, "Rating"]].map(([value, label]) => (
            <FadeIn key={String(label)} className="glass rounded-[20px] p-4 text-center">
              <p className="font-display text-2xl font-bold text-primary-deep">{Number(value).toLocaleString()}</p>
              <p className="mt-1 text-xs text-ink/45">{label}</p>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.05} className="glass mt-4 rounded-[20px] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">VS Competitive</h2>
            <span className="rounded-full bg-plum/10 px-3 py-1 text-xs font-bold text-plum-deep">{winRate}% Win Rate</span>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-black/10 text-center">
            <div><p className="font-display text-2xl font-bold">{wins}</p><p className="text-xs text-ink/45">Win</p></div>
            <div><p className="font-display text-2xl font-bold">{losses}</p><p className="text-xs text-ink/45">Loss</p></div>
            <div><p className="font-display text-2xl font-bold">{draws}</p><p className="text-xs text-ink/45">Draw</p></div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="glass mt-4 rounded-[24px] p-5">
          <div className="flex items-center justify-between"><h2 className="font-display font-semibold">XP Breakdown</h2><span className="text-sm font-bold text-primary-deep">{xpBreakdown.total.toLocaleString()} XP</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[
              ["Push-up", xpBreakdown.pushupXp], ["VS", xpBreakdown.vsXp], ["Boss", xpBreakdown.bossXp],
              ["Daily", xpBreakdown.dailyXp], ["Session", xpBreakdown.sessionXp], ["Badge", xpBreakdown.badgeXp],
              ["Streak", xpBreakdown.streakXp],
            ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-black/[.03] p-3"><p className="text-xs text-ink/45">{label}</p><p className="mt-1 font-display font-bold text-primary-deep">+{Number(value).toLocaleString()}</p></div>)}
          </div>
        </FadeIn>

        <FadeIn delay={0.15} className="glass mt-4 rounded-[24px] p-5">
          <div className="flex items-center justify-between"><h2 className="font-display font-semibold">🏅 Badges ของฉัน</h2><Link href="/achievements" className="text-sm text-primary-deep underline underline-offset-4">ดูทั้งหมด</Link></div>
          {badges.length ? <div className="mt-4 flex flex-wrap gap-2">{badges.map((b) => <span key={b.code} className="rounded-full bg-sun/15 px-3 py-2 text-sm">{b.icon} {b.name_th}</span>)}</div> : <p className="mt-3 text-sm text-ink/45">ยังไม่มี Badge ลองทำ Daily Challenge หรือทำสถิติใหม่ดู</p>}
        </FadeIn>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/history" className="rounded-2xl bg-white/70 px-5 py-3 text-sm font-medium shadow-sm">ประวัติการวิดพื้น →</Link>
          <Link href="/vs" className="rounded-2xl bg-plum px-5 py-3 text-sm font-medium text-white shadow-sm">VS →</Link>
          <Link href="/boss" className="rounded-2xl bg-sun/20 px-5 py-3 text-sm font-medium text-sun-deep">Boss →</Link>
          <Link href="/leaderboard" className="rounded-2xl bg-white/70 px-5 py-3 text-sm font-medium shadow-sm">Leaderboard →</Link>
        </div>
      </div>
    </main>
  );
}
