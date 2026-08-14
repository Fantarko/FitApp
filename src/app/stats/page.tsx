import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FadeIn from "@/components/animation/FadeIn";
import CountUp from "@/components/animation/CountUp";
import DailyRepsChart from "@/components/DailyRepsChart";
import MonthActivityCalendar from "@/components/MonthActivityCalendar";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/stats");

  const [{ data: daily }, monthRes, streakRes] = await Promise.all([
    supabase.rpc("get_daily_reps_this_month", { p_user_id: user.id }),
    supabase.rpc("get_month_reps", { p_user_id: user.id }),
    supabase.rpc("get_current_streak", { p_user_id: user.id }),
  ]);

  const dailyData = (daily ?? []) as { day: string; reps: number }[];
  const monthReps = monthRes.data ?? 0;
  const streak = streakRes.data ?? 0;
  const activeDays = dailyData.length;
  const bestDay = dailyData.reduce((max, d) => Math.max(max, d.reps), 0);

  return (
    <main className="flex-1 px-6 py-10 md:px-10">
      <FadeIn>
        <h1 className="font-display text-3xl font-bold text-primary-deep">รายงานของฉัน</h1>
      </FadeIn>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <FadeIn delay={0.05} className="glass rounded-[20px] p-5 text-center">
          <p className="text-sm text-ink/50">รวมเดือนนี้</p>
          <CountUp value={monthReps} className="font-display text-3xl font-bold text-primary-deep" />
        </FadeIn>
        <FadeIn delay={0.1} className="glass rounded-[20px] p-5 text-center">
          <p className="text-sm text-ink/50">สตรีคปัจจุบัน</p>
          <CountUp value={streak} className="font-display text-3xl font-bold text-sun-deep" />
        </FadeIn>
        <FadeIn delay={0.15} className="glass rounded-[20px] p-5 text-center">
          <p className="text-sm text-ink/50">วันที่ทำได้เยอะสุด</p>
          <CountUp value={bestDay} className="font-display text-3xl font-bold text-plum-deep" />
        </FadeIn>
      </div>

      <FadeIn delay={0.2} className="glass mt-6 rounded-[24px] p-5">
        <h2 className="font-display font-semibold text-ink">จำนวนครั้งรายวัน — เดือนนี้</h2>
        <div className="mt-4">
          <DailyRepsChart data={dailyData} />
        </div>
      </FadeIn>

      <FadeIn delay={0.25} className="glass mt-6 max-w-md rounded-[24px] p-5">
        <h2 className="font-display font-semibold text-ink">
          ปฏิทินกิจกรรม ({activeDays} วันที่วิด)
        </h2>
        <div className="mt-4">
          <MonthActivityCalendar data={dailyData} />
        </div>
      </FadeIn>
    </main>
  );
}
