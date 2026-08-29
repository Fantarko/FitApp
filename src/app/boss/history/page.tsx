import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";

export default async function BossHistoryPage() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) redirect("/login?next=/boss/history");

 const { data } = await supabase.from("user_boss_progress")
 .select("boss_id, defeated_at, best_reps_used, bosses(stage, name_th, hp)")
 .eq("user_id", user.id)
 .order("defeated_at", { ascending: false });

 return <main className="relative flex-1 overflow-hidden px-6 py-10"> <BlobBackground colors={["var(--color-sun)", "var(--color-primary)"]}/> <div className="mx-auto max-w-2xl"> <Link href="/boss" className="text-sm text-ink/45"> บอส</Link> <FadeIn className="mt-4"><h1 className="font-display text-3xl font-bold text-sun-deep">ประวัติศึกบอส</h1><p className="mt-1 text-sm text-ink/50">Best score, จำนวนครั้งที่ใช้ และวันที่ปราบได้</p></FadeIn> <div className="mt-6 space-y-3">
 {(data ?? []).map((row: any) => <FadeIn key={row.boss_id} className="glass rounded-[20px] p-4"><div className="flex items-center justify-between"><div><p className="font-display font-semibold">ด่าน {row.bosses?.stage}: {row.bosses?.name_th}</p><p className="mt-1 text-xs text-ink/45">{row.defeated_at ? new Date(row.defeated_at).toLocaleDateString("th-TH") : "ยังไม่ปราบ"}</p></div><div className="text-right"><p className="font-display text-xl font-bold text-primary-deep">{row.best_reps_used ?? "—"}</p><p className="text-[11px] text-ink/40">จำนวนครั้งที่ใช้</p></div></div><p className="mt-3 rounded-xl bg-sun/10 px-3 py-2 text-xs font-medium text-sun-deep">รางวัล: +100 XP · Badge เมื่อผ่านเงื่อนไข</p></FadeIn>)}
 {(!data || data.length === 0) && <div className="glass rounded-[24px] p-8 text-center text-sm text-ink/45">ยังไม่มีประวัติบอส</div>}
 </div> </div> </main>;
}
