import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";

function formatDuration(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/history");
  const { data, error } = await supabase.from("pushup_sessions").select("id, rep_count, duration_seconds, created_at, match_id, low_quality_ratio").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  const sessions = data ?? [];

  return <main className="relative flex-1 overflow-hidden px-6 py-10 md:px-10"><BlobBackground colors={["var(--color-primary)", "var(--color-sun)"]}/><div className="mx-auto max-w-3xl"><FadeIn><h1 className="font-display text-3xl font-bold text-primary-deep">ประวัติการวิดพื้น</h1><p className="mt-1 text-sm text-ink/50">ดูทุก Session ล่าสุดของคุณ</p></FadeIn><FadeIn delay={0.1} className="glass mt-6 overflow-hidden rounded-[24px]">{error ? <p className="p-6 text-sm text-red-600">โหลดประวัติไม่สำเร็จ: {error.message}</p> : sessions.length === 0 ? <p className="p-8 text-center text-sm text-ink/45">ยังไม่มีประวัติ เริ่มวิดพื้นครั้งแรกได้เลย</p> : <div className="divide-y divide-black/5">{sessions.map((s) => { const date = new Date(s.created_at); return <div key={s.id} className="flex flex-wrap items-center gap-4 p-4 transition hover:bg-white/40"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-tint font-display font-bold text-primary-deep">{s.rep_count}</div><div className="min-w-[150px] flex-1"><p className="font-medium">{s.match_id ? "⚔️ VS Match" : "💪 Solo Session"}</p><p className="text-xs text-ink/45">{date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} · {date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="text-right text-sm"><p className="font-semibold">{formatDuration(s.duration_seconds ?? 0)}</p><p className="text-xs text-ink/45">{s.duration_seconds ? `${Math.round((s.rep_count / s.duration_seconds) * 60)} ครั้ง/นาที` : "—"}</p></div></div>})}</div>}</FadeIn></div></main>;
}
