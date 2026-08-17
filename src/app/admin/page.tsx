import FadeIn from "@/components/animation/FadeIn";
import CountUp from "@/components/animation/CountUp";
import { createClient } from "@/lib/supabase/server";
import PlayerManager from "@/components/admin/PlayerManager";
import BossManager from "@/components/admin/BossManager";
import ReportActions from "@/components/admin/ReportActions";
import BlobBackground from "@/components/BlobBackground";

export default async function AdminPage() {
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { count: userCount },
    { count: matchesToday },
    { count: openReports },
    { data: reports },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("vs_matches")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("cheat_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("cheat_reports")
      .select("id, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <main className="relative flex-1 overflow-hidden px-6 py-10 md:px-10">
      <BlobBackground colors={["var(--color-ink)", "var(--color-plum)"]} />

      <FadeIn>
        <h1 className="font-display text-3xl font-bold text-primary-deep">Admin</h1>
      </FadeIn>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <FadeIn delay={0.05} className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold">ผู้ใช้ทั้งหมด</p>
          <CountUp
            value={userCount ?? 0}
            className="mt-1 block text-3xl font-bold text-primary-deep"
          />
        </FadeIn>
        <FadeIn delay={0.1} className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold">แมตช์ VS วันนี้</p>
          <CountUp
            value={matchesToday ?? 0}
            className="mt-1 block text-3xl font-bold text-plum-deep"
          />
        </FadeIn>
        <FadeIn delay={0.15} className="glass rounded-[20px] p-5">
          <p className="font-display font-semibold">รายงานที่ยังไม่ปิด</p>
          <CountUp
            value={openReports ?? 0}
            className="mt-1 block text-3xl font-bold text-sun-deep"
          />
        </FadeIn>
      </div>

      <FadeIn delay={0.2} className="mt-8 glass rounded-[20px] p-5">
        <h2 className="font-display font-semibold text-ink">รายงานล่าสุด</h2>
        {!reports || reports.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">ยังไม่มีรายงาน</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink/80">{r.reason}</span>
                <ReportActions reportId={r.id} status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </FadeIn>

      <FadeIn delay={0.25} className="mt-8">
        <PlayerManager />
      </FadeIn>

      <FadeIn delay={0.3} className="mt-8">
        <BossManager />
      </FadeIn>

      <p className="mt-8 text-sm text-ink/50">
        หน้านี้เข้าถึงได้เฉพาะบัญชีที่มี role = admin ใน ตาราง profiles
        (ตรวจสอบใน middleware ฝั่ง server)
      </p>
    </main>
  );
}
