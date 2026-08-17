import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/leaderboard");
  const [{ data: monthly }, { data: friends }] = await Promise.all([
    supabase.rpc("get_monthly_leaderboard"),
    supabase.rpc("get_friends_monthly_reps", { p_user_id: user.id }),
  ]);
  const globalRows = (monthly ?? []) as { user_id: string; display_name: string | null; month_reps: number }[];
  const friendRows = (friends ?? []) as { user_id: string; display_name: string | null; month_reps: number }[];
  const renderRows = (rows: typeof globalRows) => <ol className="mt-3 divide-y divide-black/5">{rows.map((r, i) => <li key={r.user_id} className={`flex items-center gap-3 px-3 py-3 ${r.user_id === user.id ? "rounded-xl bg-primary-tint" : ""}`}><span className="w-7 text-center font-display font-bold text-ink/45">{i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}</span><span className="flex-1 font-medium">{r.display_name ?? "ผู้เล่นไม่ระบุชื่อ"}</span><span className="font-display font-bold text-primary-deep">{r.month_reps.toLocaleString()}</span></li>)}</ol>;
  return <main className="relative flex-1 overflow-hidden px-6 py-10 md:px-10"><BlobBackground colors={["var(--color-primary)", "var(--color-plum)"]}/><div className="mx-auto max-w-4xl"><FadeIn><h1 className="font-display text-3xl font-bold text-primary-deep">Leaderboard</h1><p className="mt-1 text-sm text-ink/50">อันดับจากจำนวนวิดพื้นเดือนนี้</p></FadeIn><div className="mt-6 grid gap-6 lg:grid-cols-2"><FadeIn className="glass rounded-[24px] p-5"><h2 className="font-display text-lg font-semibold">🌎 ทุกคน</h2>{globalRows.length ? renderRows(globalRows) : <p className="mt-4 text-sm text-ink/45">ยังไม่มีข้อมูล</p>}</FadeIn><FadeIn delay={0.1} className="glass rounded-[24px] p-5"><h2 className="font-display text-lg font-semibold">👥 เพื่อน</h2>{friendRows.length ? renderRows(friendRows) : <p className="mt-4 text-sm text-ink/45">เพิ่มเพื่อนเพื่อสร้างอันดับของกลุ่มคุณ</p>}</FadeIn></div></div></main>;
}
