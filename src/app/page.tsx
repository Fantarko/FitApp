import Link from "next/link";
import GlassButton from "@/components/ui/GlassButton";
import RepRing from "@/components/ui/RepRing";
import FadeIn from "@/components/animation/FadeIn";
import ScaleIn from "@/components/animation/ScaleIn";
import SlideIn from "@/components/animation/SlideIn";
import { createClient } from "@/lib/supabase/server";

type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  month_reps: number;
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let todayReps = 0;
  let monthReps = 0;
  let streak = 0;
  let myBadges: { code: string; icon: string; name_th: string }[] = [];

  if (user) {
    const [today, month, streakRes, badgeRes] = await Promise.all([
      supabase.rpc("get_today_reps", { p_user_id: user.id }),
      supabase.rpc("get_month_reps", { p_user_id: user.id }),
      supabase.rpc("get_current_streak", { p_user_id: user.id }),
      supabase
        .from("user_badges")
        .select("badges(code, icon, name_th)")
        .eq("user_id", user.id),
    ]);
    todayReps = today.data ?? 0;
    monthReps = month.data ?? 0;
    streak = streakRes.data ?? 0;
    myBadges = (badgeRes.data ?? [])
      .map((row) => row.badges)
      .filter(Boolean) as unknown as { code: string; icon: string; name_th: string }[];
  }

    const {data: leaderboard,error: leaderboardError,
    } = await supabase.rpc("get_monthly_leaderboard");
        
    if (leaderboardError) {
          console.error("Leaderboard error:", leaderboardError);
    }

    const rows = (leaderboard ?? []) as LeaderboardRow[];
    const medals = ["🥇", "🥈", "🥉"];

  return (
    <main className="flex-1 flex flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* one asymmetric brush shape instead of three uniform blurred circles —
            the "three matching glow orbs" look is the fastest AI-generated tell */}
        <svg
          className="animate-float-slow absolute -top-16 -right-32 h-[560px] w-[560px] opacity-[0.14] md:-right-10"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M45,-58.5C58.4,-49.6,68.8,-35.1,72.6,-18.9C76.4,-2.7,73.6,15.2,65.1,29.6C56.6,44,42.5,54.9,26.7,61.8C10.9,68.6,-6.6,71.5,-22.4,67.2C-38.2,62.9,-52.3,51.4,-61.2,36.6C-70.1,21.8,-73.8,3.7,-70.4,-12.6C-67,-28.9,-56.5,-43.4,-42.9,-52.6C-29.3,-61.8,-14.6,-65.7,1.6,-67.7C17.9,-69.7,35.7,-67.4,45,-58.5Z"
            transform="translate(100 100)"
            fill="var(--color-primary)"
          />
        </svg>
        <svg
          className="animate-float absolute bottom-[-120px] left-[-120px] h-[420px] w-[420px] opacity-[0.12]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M39.5,-51.6C50.7,-42.6,58.7,-29.6,61.6,-15.3C64.5,-1,63.3,14.6,56.4,27.4C49.5,40.2,36.9,50.2,22.5,56.4C8.1,62.6,-8.1,65,-23.3,60.7C-38.5,56.4,-52.7,45.4,-60.5,31C-68.3,16.6,-69.7,-1.2,-64.6,-16.6C-59.5,-32,-47.9,-45,-34.3,-53.6C-20.7,-62.2,-5.1,-66.4,8.9,-64.4C22.9,-62.4,26.3,-60.6,39.5,-51.6Z"
            transform="translate(100 100)"
            fill="var(--color-sun)"
          />
        </svg>
      </div>

      {/* hero: solo push-up is THE action on this screen — everything else is secondary */}
      <section className="flex flex-col items-center gap-8 px-6 pt-12 pb-8 text-center md:pt-20">
        <FadeIn className="space-y-3">
          <p className="inline-block rounded-full bg-primary-tint px-4 py-1 text-sm font-medium text-primary-deep">
            {todayReps > 0 ? `วันนี้วิดพื้นไปแล้ว ${todayReps} ครั้ง` : "วันนี้ยังไม่ได้วิดพื้นเลย"}
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
            นับให้แม่น <br className="hidden md:block" />
            <span className="text-primary-deep">วิดพื้นทุกวัน</span>
          </h1>
        </FadeIn>

        <ScaleIn delay={0.15}>
          <RepRing value={todayReps} goal={30} label="ครั้งวันนี้" />
        </ScaleIn>

        <SlideIn direction="up" delay={0.3} className="w-full max-w-xs">
          <Link href={user ? "/pushup" : "/login"} className="block w-full">
            <GlassButton
              variant="primary"
              className="w-full py-4 text-lg">
              เริ่มวิดพื้น
            </GlassButton>
          </Link>
        </SlideIn>

        <FadeIn delay={0.4} className="flex gap-3 text-sm">
          <Link href={user ? "/vs" : "/login"} className="text-plum-deep underline underline-offset-4">
            แข่งกับเพื่อน
          </Link>
          <span className="text-ink/30">·</span>
          <Link href={user ? "/boss" : "/login"} className="text-sun-deep underline underline-offset-4">
            โหมดปราบบอส
          </Link>
        </FadeIn>
      </section>

      <SlideIn direction="up" delay={0.1} className="grid gap-4 px-6 py-8 md:grid-cols-2 md:px-10">
        <div className="glass rounded-[20px] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="font-display font-semibold text-sun-deep">สตรีค {streak} วัน</p>
          <p className="mt-1 text-sm text-ink/60">ทำติดต่อกันเพื่อรักษาสตรีค</p>
        </div>
        <div className="glass rounded-[20px] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="font-display font-semibold text-primary-deep">รวมเดือนนี้ {monthReps} ครั้ง</p>
          <p className="mt-1 text-sm text-ink/60">อัปเดตทุกครั้งที่จบเซสชัน</p>
        </div>
      </SlideIn>

      {user && myBadges.length > 0 && (
        <FadeIn delay={0.15} className="px-6 md:px-10">
          <div className="glass mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-[20px] p-4">
            <span className="text-sm font-medium text-ink/50">เหรียญของคุณ</span>
            {myBadges.map((b) => (
              <span
                key={b.code}
                title={b.name_th}
                className="flex items-center gap-1 rounded-full bg-sun/15 px-3 py-1 text-sm"
              >
                <span>{b.icon}</span>
                <span className="text-ink/70">{b.name_th}</span>
              </span>
            ))}
          </div>
        </FadeIn>
      )}

      <section className="px-6 pb-16 pt-8 md:px-10">
        <FadeIn delay={0.2} className="glass mx-auto max-w-xl rounded-[24px] p-5">
          <h2 className="font-display text-lg font-bold text-primary-deep">
            อันดับเดือนนี้
          </h2>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">ยังไม่มีใครวิดพื้นเดือนนี้เลย เป็นคนแรกสิ!</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {rows.map((row, i) => (
                <SlideIn
                  key={row.user_id}
                  direction="left"
                  delay={i * 0.07}
                >
                  <li
                    className={`flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-tint/50 ${
                      user && row.user_id === user.id ? "bg-primary-tint" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-display font-bold text-ink/50">
                        {medals[i] ?? i + 1}
                      </span>
                      <span className="font-medium">{row.display_name ?? "ผู้เล่นไม่ระบุชื่อ"}</span>
                    </div>
                    <span className="font-display font-bold text-primary-deep">
                      {row.month_reps} ครั้ง
                    </span>
                  </li>
                </SlideIn>
              ))}
            </ol>
          )}
        </FadeIn>
      </section>
    </main>
  );
}
