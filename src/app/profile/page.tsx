import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";
import {
  calculateXp,
  getLevelFromXp,
  getXpBreakdown,
} from "@/lib/progression";

type Badge = {
  code: string;
  icon: string;
  name_th: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const [
    profileRes,
    sessionsRes,
    matchesRes,
    badgesRes,
    streakRes,
    dailyRes,
    bossRes,
    progressRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .single(),

    supabase
      .from("pushup_sessions")
      .select("rep_count")
      .eq("user_id", user.id),

    supabase
      .from("vs_matches")
      .select(
        "winner_id, challenger_id, opponent_id, challenger_reps, opponent_reps"
      )
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .eq("status", "completed"),

    supabase
      .from("user_badges")
      .select("badges(code, icon, name_th)")
      .eq("user_id", user.id),

    supabase.rpc("get_current_streak", {
      p_user_id: user.id,
    }),

    supabase
      .from("daily_challenge_progress")
      .select("session_id")
      .eq("user_id", user.id),

    supabase
      .from("user_boss_progress")
      .select("boss_id, best_reps_used, defeated_at")
      .eq("user_id", user.id),

    supabase.rpc("get_my_progress"),
  ]);

  const sessions = sessionsRes.data ?? [];
  const matches = matchesRes.data ?? [];

  const wins = matches.filter(
    (m) => m.winner_id === user.id
  ).length;

  const draws = matches.filter(
    (m) => !m.winner_id
  ).length;

  const losses = matches.filter(
    (m) => !!m.winner_id && m.winner_id !== user.id
  ).length;

  const badges = (badgesRes.data ?? [])
    .map((x) => x.badges)
    .filter(Boolean) as unknown as Badge[];

  const reps = sessions.reduce(
    (sum, s) => sum + (s.rep_count ?? 0),
    0
  );

  const bestRecord = sessions.reduce(
    (best, s) => Math.max(best, s.rep_count ?? 0),
    0
  );

  const bossWins = (bossRes.data ?? []).filter(
    (b) => b.defeated_at
  ).length;

  const dailyClears = dailyRes.data?.length ?? 0;
  const streak = streakRes.data ?? 0;

  const calculated = calculateXp({
    reps,
    sessions: sessions.length,
    wins,
    draws,
    bossWins,
    dailyClears,
    badges: badges.length,
    streak,
  });

  const serverProgress = progressRes.data as {
    xp: number;
    level: number;
    rating: number;
  } | null;

  const xp = serverProgress?.xp ?? calculated;

  const level = serverProgress
    ? getLevelFromXp(serverProgress.xp)
    : getLevelFromXp(xp);

  const xpBreakdown = getXpBreakdown({
    reps,
    sessions: sessions.length,
    wins,
    draws,
    bossWins,
    dailyClears,
    badges: badges.length,
    streak,
  });

  const rating =
    serverProgress?.rating ??
    Math.max(
      100,
      1000 + wins * 20 - losses * 15 + draws * 5
    );

  const winRate = matches.length
    ? Math.round((wins / matches.length) * 100)
    : 0;

  const xpCurrent = Math.max(
    0,
    xp - level.currentLevelXp
  );

  const xpRequired =
    level.nextLevelXp - level.currentLevelXp;

  const xpRemaining = Math.max(
    0,
    level.nextLevelXp - xp
  );

  return (
    <main className="relative min-h-full overflow-hidden px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <BlobBackground
        colors={[
          "var(--color-primary)",
          "var(--color-plum)",
        ]}
      />

      <div className="relative mx-auto max-w-4xl">
        {/* HEADER */}
        <FadeIn>
          <section className="glass overflow-hidden rounded-[28px] p-5 sm:p-7">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Avatar */}
              {profileRes.data?.avatar_url ? (
                <img
                  src={profileRes.data.avatar_url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20 sm:rounded-[22px]"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-2xl font-display font-bold text-primary-deep sm:h-20 sm:w-20 sm:rounded-[22px] sm:text-3xl">
                  {(profileRes.data?.display_name ?? "?").charAt(0)}
                </div>
              )}

              {/* Name */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                  โปรไฟล์นักกีฬา
                </p>

                <h1 className="mt-1 truncate font-display text-2xl font-bold text-primary-deep sm:text-3xl">
                  {profileRes.data?.display_name ??
                    "นักวิดพื้น"}
                </h1>

                <p className="mt-1 text-sm text-ink/50">
                  Level {level.level}{" "}
                  <span className="mx-1">·</span>{" "}
                  {xp.toLocaleString()} XP
                </p>
              </div>

              <Link
                href="/stats"
                className="hidden shrink-0 rounded-xl bg-black/5 px-4 py-2 text-sm font-medium transition hover:bg-black/10 sm:block"
              >
                ดูรายงาน
              </Link>
            </div>

            {/* Mobile report button */}
            <Link
              href="/stats"
              className="mt-4 block rounded-xl bg-black/5 px-4 py-3 text-center text-sm font-medium transition hover:bg-black/10 sm:hidden"
            >
              ดูรายงาน →
            </Link>

            {/* XP BAR */}
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-primary-deep">
                  Level {level.level}
                </span>

                <span className="text-ink/45">
                  {xpCurrent.toLocaleString()} /{" "}
                  {xpRequired.toLocaleString()} XP
                </span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, level.progress)
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-[11px] text-ink/40">
                <span>ความก้าวหน้า</span>

                <span>
                  {xpRemaining.toLocaleString()} XP ถึง Level{" "}
                  {level.level + 1}
                </span>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* STATS */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [reps, "จำนวนครั้งรวม", "💪"],
            [bestRecord, "สถิติที่ดีที่สุด", "🔥"],
            [streak, "สตรีค", "⚡"],
            [rating, "เรตติ้ง", "🏆"],
          ].map(([value, label, icon]) => (
            <FadeIn
              key={String(label)}
              className="glass rounded-[20px] p-4 sm:p-5"
            >
              <div className="flex items-start justify-between">
                <span className="text-lg">{icon}</span>
              </div>

              <p className="mt-3 font-display text-2xl font-bold text-primary-deep sm:text-3xl">
                {Number(value).toLocaleString()}
              </p>

              <p className="mt-1 text-[11px] leading-tight text-ink/45 sm:text-xs">
                {label}
              </p>
            </FadeIn>
          ))}
        </div>

        {/* VS */}
        <FadeIn
          delay={0.05}
          className="glass mt-4 rounded-[24px] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-ink/40">
                COMPETITIVE
              </p>

              <h2 className="mt-1 font-display text-lg font-semibold">
                การแข่งขัน VS
              </h2>
            </div>

            <div className="rounded-full bg-plum/10 px-3 py-1.5 text-xs font-bold text-plum-deep">
              Win Rate {winRate}%
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-black/10">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-green-600">
                {wins}
              </p>
              <p className="mt-1 text-xs text-ink/45">
                ชนะ
              </p>
            </div>

            <div className="text-center">
              <p className="font-display text-2xl font-bold">
                {losses}
              </p>
              <p className="mt-1 text-xs text-ink/45">
                แพ้
              </p>
            </div>

            <div className="text-center">
              <p className="font-display text-2xl font-bold">
                {draws}
              </p>
              <p className="mt-1 text-xs text-ink/45">
                เสมอ
              </p>
            </div>
          </div>
        </FadeIn>

        {/* XP BREAKDOWN */}
        <FadeIn
          delay={0.1}
          className="glass mt-4 rounded-[24px] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-ink/40">
                PROGRESSION
              </p>

              <h2 className="mt-1 font-display text-lg font-semibold">
                รายละเอียด XP
              </h2>
            </div>

            <span className="font-display text-lg font-bold text-primary-deep">
              {xpBreakdown.total.toLocaleString()}
              <span className="ml-1 text-xs">XP</span>
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["💪", "วิดพื้น", xpBreakdown.pushupXp],
              ["⚔️", "VS", xpBreakdown.vsXp],
              ["👹", "บอส", xpBreakdown.bossXp],
              ["📅", "รายวัน", xpBreakdown.dailyXp],
              ["🎯", "เซสชัน", xpBreakdown.sessionXp],
              ["🏅", "Badge", xpBreakdown.badgeXp],
              ["🔥", "สตรีค", xpBreakdown.streakXp],
            ].map(([icon, label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl bg-black/[.03] p-3.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {icon}
                  </span>

                  <p className="text-xs text-ink/45">
                    {label}
                  </p>
                </div>

                <p className="mt-2 font-display font-bold text-primary-deep">
                  +{Number(value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* BADGES */}
        <FadeIn
          delay={0.15}
          className="glass mt-4 rounded-[24px] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-ink/40">
                ACHIEVEMENTS
              </p>

              <h2 className="mt-1 font-display text-lg font-semibold">
                🏅 Badges ของฉัน
              </h2>
            </div>

            <Link
              href="/achievements"
              className="shrink-0 text-xs font-medium text-primary-deep underline underline-offset-4"
            >
              ดูทั้งหมด
            </Link>
          </div>

          {badges.length ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {badges.map((badge) => (
                <div
                  key={badge.code}
                  className="flex shrink-0 items-center gap-2 rounded-2xl bg-sun/15 px-4 py-3"
                >
                  <span className="text-lg">
                    {badge.icon}
                  </span>

                  <span className="whitespace-nowrap text-sm font-medium">
                    {badge.name_th}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-black/[.03] p-4">
              <p className="text-sm text-ink/45">
                ยังไม่มี Badge
              </p>

              <p className="mt-1 text-xs text-ink/35">
                ลองทำ Daily Challenge หรือทำสถิติใหม่ดู
              </p>
            </div>
          )}
        </FadeIn>

        {/* NAVIGATION */}
        <FadeIn delay={0.2}>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link
              href="/history"
              className="group rounded-2xl bg-white/75 p-4 text-center text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            >
              <span className="block text-xl">📊</span>
              <span className="mt-2 block">
                ประวัติ
              </span>
            </Link>

            <Link
              href="/vs"
              className="group rounded-2xl bg-plum p-4 text-center text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5"
            >
              <span className="block text-xl">⚔️</span>
              <span className="mt-2 block">
                VS
              </span>
            </Link>

            <Link
              href="/boss"
              className="group rounded-2xl bg-sun/20 p-4 text-center text-sm font-medium text-sun-deep shadow-sm transition hover:-translate-y-0.5"
            >
              <span className="block text-xl">👹</span>
              <span className="mt-2 block">
                บอส
              </span>
            </Link>

            <Link
              href="/leaderboard"
              className="group rounded-2xl bg-white/75 p-4 text-center text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            >
              <span className="block text-xl">🏆</span>
              <span className="mt-2 block">
                อันดับ
              </span>
            </Link>
          </div>
        </FadeIn>

        <div className="h-4" />
      </div>
    </main>
  );
}