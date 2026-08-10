import Link from "next/link";
import GlassButton from "@/components/ui/GlassButton";
import RepRing from "@/components/ui/RepRing";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let todayReps = 0;
  let monthReps = 0;
  let streak = 0;

  if (user) {
    const [today, month, streakRes] = await Promise.all([
      supabase.rpc("get_today_reps", { p_user_id: user.id }),
      supabase.rpc("get_month_reps", { p_user_id: user.id }),
      supabase.rpc("get_current_streak", { p_user_id: user.id }),
    ]);
    todayReps = today.data ?? 0;
    monthReps = month.data ?? 0;
    streak = streakRes.data ?? 0;
  }

  return (
    <main className="flex-1 flex flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-sun/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-plum/15 blur-3xl" />
      </div>

      <section className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12 text-center md:py-20">
        <div className="space-y-3">
          <p className="inline-block rounded-full bg-primary-tint px-4 py-1 text-sm font-medium text-primary-deep">
            {todayReps > 0 ? `วันนี้วิดพื้นไปแล้ว ${todayReps} ครั้ง` : "วันนี้ยังไม่ได้วิดพื้นเลย"}
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
            นับให้แม่น <br className="hidden md:block" />
            <span className="text-primary-deep">แข่งกันให้สนุก</span>
          </h1>
          <p className="mx-auto max-w-md text-ink/70">
            เปิดกล้อง วิดพื้น แล้วให้ระบบนับให้ — เก็บสถิติทุกวัน
            หรือจะท้าเพื่อนแข่งแบบตัวต่อตัวก็ได้
          </p>
        </div>

        <RepRing value={todayReps} goal={30} label="ครั้งวันนี้" />

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href={user ? "/pushup" : "/login"}>
            <GlassButton variant="primary">เริ่มวิดพื้นวันนี้</GlassButton>
          </Link>
          <Link href={user ? "/vs" : "/login"}>
            <GlassButton variant="plum">แข่งกับเพื่อน (VS)</GlassButton>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 px-6 pb-16 md:grid-cols-3 md:px-10">
        <div className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold text-sun-deep">สตรีค {streak} วัน</p>
          <p className="mt-1 text-sm text-ink/60">ทำติดต่อกันเพื่อรักษาสตรีค</p>
        </div>
        <div className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold text-primary-deep">รวมเดือนนี้ {monthReps} ครั้ง</p>
          <p className="mt-1 text-sm text-ink/60">อัปเดตทุกครั้งที่จบเซสชัน</p>
        </div>
        <div className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold text-plum-deep">อันดับ VS —</p>
          <p className="mt-1 text-sm text-ink/60">แข่งครั้งแรกเพื่อเริ่มจัดอันดับ</p>
        </div>
      </section>
    </main>
  );
}
