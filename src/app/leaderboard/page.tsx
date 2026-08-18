import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";

type Row = { user_id: string; display_name: string | null; reps: number; rank: number };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/leaderboard");
  const params = await searchParams;
  const period = ["weekly", "monthly", "all-time"].includes(params.period ?? "") ? params.period! : "monthly";

  const { data, error } = await supabase.rpc("get_leaderboard", { p_period: period });
  const rows = (data ?? []) as Row[];
  const myRank = rows.find((r) => r.user_id === user.id)?.rank;

  const renderRows = (items: Row[]) => (
    <ol className="mt-3 divide-y divide-black/5">
      {items.map((r) => <li key={r.user_id} className={`flex items-center gap-3 px-3 py-3 ${r.user_id === user.id ? "rounded-xl bg-primary-tint" : ""}`}>
        <span className="w-8 text-center font-display font-bold text-ink/45">{r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank - 1] : r.rank}</span>
        <Link href={`/friends/${r.user_id}`} className="flex-1 font-medium hover:underline">{r.display_name ?? "ผู้เล่นไม่ระบุชื่อ"}</Link>
        <span className="font-display font-bold text-primary-deep">{Number(r.reps).toLocaleString()}</span>
      </li>)}
    </ol>
  );

  return <main className="relative flex-1 overflow-hidden px-6 py-10 md:px-10">
    <BlobBackground colors={["var(--color-primary)", "var(--color-plum)"]}/>
    <div className="mx-auto max-w-4xl">
      <FadeIn>
        <h1 className="font-display text-3xl font-bold text-primary-deep">อันดับ</h1>
        <p className="mt-1 text-sm text-ink/50">อันดับจากจำนวนวิดพื้น</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[["weekly","รายสัปดาห์"],["monthly","รายเดือน"],["all-time","ตลอดกาล"]].map(([key,label]) =>
            <Link key={key} href={`/leaderboard?period=${key}`} className={`rounded-full px-4 py-2 text-xs font-semibold ${period === key ? "bg-primary text-white" : "bg-white/70 text-ink/60"}`}>{label}</Link>
          )}
          {myRank && <span className="ml-auto rounded-full bg-plum/10 px-4 py-2 text-xs font-bold text-plum-deep">อันดับของคุณ #{myRank}</span>}
        </div>
      </FadeIn>
      <FadeIn delay={0.1} className="glass mt-6 rounded-[24px] p-5">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">🌎 ทั่วโลก</h2><span className="text-xs text-ink/40">{period === "weekly" ? "รายสัปดาห์" : period === "all-time" ? "ตลอดกาล" : "รายเดือน"}</span></div>
        {error ? <p className="mt-4 text-sm text-red-600">ต้องติดตั้ง migration ล่าสุดก่อนใช้อันดับแบบใหม่</p> : rows.length ? renderRows(rows) : <p className="mt-4 text-sm text-ink/45">ยังไม่มีข้อมูล</p>}
      </FadeIn>
    </div>
  </main>;
}
