import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";

export default async function VsHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vs/history");

  const { data } = await supabase.from("vs_matches")
    .select("id, challenger_id, opponent_id, challenger_reps, opponent_reps, winner_id, status, created_at")
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .eq("status", "completed").order("created_at", { ascending: false }).limit(50);

  const ids = [...new Set((data ?? []).flatMap((m) => [m.challenger_id, m.opponent_id]).filter(Boolean))];
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "ผู้เล่น"]));

  return <main className="relative flex-1 overflow-hidden px-6 py-10">
    <BlobBackground colors={["var(--color-plum)", "var(--color-sun)"]}/>
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between"><div><Link href="/vs" className="text-sm text-ink/45">← VS</Link><h1 className="mt-2 font-display text-3xl font-bold text-plum-deep">Match History</h1></div><Link href="/profile" className="rounded-xl bg-white/70 px-3 py-2 text-xs font-medium">ดู Rating</Link></div>
      <div className="mt-6 space-y-3">{(data ?? []).map((m) => { const mine = m.challenger_id === user.id ? m.challenger_reps : m.opponent_reps; const theirs = m.challenger_id === user.id ? m.opponent_reps : m.challenger_reps; const opponent = m.challenger_id === user.id ? m.opponent_id : m.challenger_id; const result = m.winner_id === user.id ? "WIN" : !m.winner_id ? "DRAW" : "LOSS"; return <FadeIn key={m.id} className="glass rounded-[20px] p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-ink/40">{new Date(m.created_at).toLocaleDateString("th-TH")}</p><p className="mt-1 font-medium">VS {names.get(opponent) ?? "คู่แข่ง"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${result==="WIN"?"bg-primary-tint text-primary-deep":result==="LOSS"?"bg-red-50 text-red-600":"bg-sun/20 text-sun-deep"}`}>{result}</span></div><div className="mt-4 flex items-center justify-center gap-5"><span className="font-display text-3xl font-bold text-primary-deep">{mine}</span><span className="text-ink/30">—</span><span className="font-display text-3xl font-bold text-ink/55">{theirs}</span></div></FadeIn>})}</div>
    </div>
  </main>;
}
