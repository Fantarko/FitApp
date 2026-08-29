import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FadeIn from "@/components/animation/FadeIn";
import SlideIn from "@/components/animation/SlideIn";
import CountUp from "@/components/animation/CountUp";
import DailyRepsChart from "@/components/DailyRepsChart";
import MonthActivityCalendar from "@/components/MonthActivityCalendar";
import ShareStatsCard from "@/components/ShareStatsCard";
import BlobBackground from "@/components/BlobBackground";

export default async function StatsPage() {
 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) redirect("/login?next=/stats");

 const [{ data: daily }, monthRes, streakRes, recordsRes, profileRes] = await Promise.all([
 supabase.rpc("get_daily_reps_this_month", { p_user_id: user.id }),
 supabase.rpc("get_month_reps", { p_user_id: user.id }),
 supabase.rpc("get_current_streak", { p_user_id: user.id }),
 supabase.rpc("get_personal_records", { p_user_id: user.id }),
 supabase.from("profiles").select("display_name").eq("id", user.id).single(),
 ]);

 const dailyData = (daily ?? []) as { day: string; reps: number }[];
 const monthReps = monthRes.data ?? 0;
 const streak = streakRes.data ?? 0;
 const activeDays = dailyData.length;
 const bestDay = dailyData.reduce((max, d) => Math.max(max, d.reps), 0);
 const records = recordsRes.data?.[0] as
 | {
 best_single_session_reps: number;
 longest_session_seconds: number;
 fastest_pace_per_min: number;
 }
 | undefined;

 return (
 <main className="relative flex-1 overflow-hidden px-6 py-10 md:px-10"> <BlobBackground colors={["var(--color-primary)", "var(--color-sun)"]} /> <div className="flex flex-wrap items-center justify-between gap-3"> <FadeIn> <h1 className="font-display text-3xl font-bold text-primary-deep">รายงานของฉัน</h1> <p className="mt-1 text-sm text-ink/50">สรุปผลการวิดพื้นของคุณเดือนนี้</p> </FadeIn> <FadeIn delay={0.05}> <ShareStatsCard
 displayName={profileRes.data?.display_name ?? "นักวิดพื้น"}
 monthReps={monthReps}
 streak={streak}
 activeDays={activeDays}
 bestSingleSession={records?.best_single_session_reps ?? 0}
 /> </FadeIn> </div>

 {/* headline stats */}
 <SlideIn direction="up" delay={0.1} className="mt-6 grid gap-4 sm:grid-cols-3"> <div className="glass rounded-[20px] p-5 text-center"> <p className="text-sm text-ink/50">รวมเดือนนี้</p> <CountUp value={monthReps} className="font-display text-3xl font-bold text-primary-deep" /> </div> <div className="glass rounded-[20px] p-5 text-center"> <p className="text-sm text-ink/50"> สตรีคปัจจุบัน</p> <CountUp value={streak} className="font-display text-3xl font-bold text-sun-deep" /> </div> <div className="glass rounded-[20px] p-5 text-center"> <p className="text-sm text-ink/50">วันที่ทำได้เยอะสุด</p> <CountUp value={bestDay} className="font-display text-3xl font-bold text-plum-deep" /> </div> </SlideIn>

 {/* personal records */}
 {records && (
 <FadeIn delay={0.15} className="glass mt-6 rounded-[24px] p-5"> <h2 className="font-display font-semibold text-ink"> สถิติส่วนตัว (PR)</h2> <div className="mt-4 grid gap-4 sm:grid-cols-3"> <div className="rounded-2xl bg-primary-tint/50 p-4 text-center"> <p className="text-xs text-ink/50">เยอะสุดใน 1 เซสชัน</p> <p className="mt-1 font-display text-2xl font-bold text-primary-deep">
 {records.best_single_session_reps} ครั้ง
 </p> </div> <div className="rounded-2xl bg-plum/10 p-4 text-center"> <p className="text-xs text-ink/50">เซสชันนานสุด</p> <p className="mt-1 font-display text-2xl font-bold text-plum-deep">
 {Math.floor(records.longest_session_seconds / 60)}:
 {(records.longest_session_seconds % 60).toString().padStart(2, "0")}
 </p> </div> <div className="rounded-2xl bg-sun/10 p-4 text-center"> <p className="text-xs text-ink/50">จังหวะเร็วสุด</p> <p className="mt-1 font-display text-2xl font-bold text-sun-deep">
 {records.fastest_pace_per_min.toFixed(0)} ครั้ง/นาที
 </p> </div> </div> </FadeIn>
 )}

 {/* chart + calendar side by side on desktop */}
 <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-5"> <FadeIn delay={0.2} className="glass min-w-0 rounded-[24px] p-5 lg:col-span-3"> <h2 className="font-display font-semibold text-ink"> จำนวนครั้งรายวัน — เดือนนี้</h2> <div className="mt-4"> <DailyRepsChart data={dailyData} /> </div> </FadeIn> <FadeIn delay={0.25} className="glass min-w-0 rounded-[24px] p-5 lg:col-span-2"> <h2 className="font-display font-semibold text-ink"> ปฏิทินกิจกรรม</h2> <div className="mt-4"> <MonthActivityCalendar data={dailyData} /> </div> </FadeIn> </div> </main>
 );
}
