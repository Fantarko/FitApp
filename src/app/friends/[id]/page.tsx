import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";
import { calculateXp, getLevelFromXp } from "@/lib/progression";

export default async function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, sessionsRes, matchesRes, badgesRes, streakRes] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", id).single(),
    supabase.from("pushup_sessions").select("rep_count").eq("user_id", id),
    supabase.from("vs_matches").select("winner_id, challenger_id, opponent_id").or(`challenger_id.eq.${id},opponent_id.eq.${id}`).eq("status", "completed"),
    supabase.from("user_badges").select("badges(code, icon, name_th)").eq("user_id", id),
    supabase.rpc("get_current_streak", { p_user_id: id }),
  ]);
  if (!profileRes.data) notFound();

  const sessions = sessionsRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const wins = matches.filter((m) => m.winner_id === id).length;
  const losses = matches.filter((m) => m.winner_id && m.winner_id !== id).length;
  const draws = matches.filter((m) => !m.winner_id).length;
  const reps = sessions.reduce((n, s) => n + (s.rep_count ?? 0), 0);
  const badges = (badgesRes.data ?? []).map((x) => x.badges).filter(Boolean) as unknown as {code:string;icon:string;name_th:string}[];
  const xp = calculateXp({ reps, sessions: sessions.length, wins, draws, badges: badges.length, streak: streakRes.data ?? 0 });
  const level = getLevelFromXp(xp);
  const rating = Math.max(100, 1000 + wins * 20 - losses * 15 + draws * 5);

  return <main className="relative flex-1 overflow-hidden px-6 py-10">
    <BlobBackground colors={["var(--color-primary)", "var(--color-plum)"]}/>
    <div className="mx-auto max-w-2xl">
      <Link href="/friends" className="text-sm text-ink/45">← เพื่อน</Link>
      <FadeIn className="glass mt-4 rounded-[28px] p-6">
        <div className="flex items-center gap-4">
          {profileRes.data.avatar_url ? <img src={profileRes.data.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover"/> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-tint text-2xl font-bold text-primary-deep">{(profileRes.data.display_name ?? "?").charAt(0)}</div>}
          <div><h1 className="font-display text-2xl font-bold text-primary-deep">{profileRes.data.display_name ?? "ผู้เล่น"}</h1><p className="text-sm text-ink/50">Level {level.level} · Rating {rating}</p></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[[reps,"Reps"],[Math.max(...sessions.map(s=>s.rep_count??0),0),"Best"],[streakRes.data??0,"Streak"],[wins,"VS Win"]].map(([v,l])=><div key={String(l)} className="rounded-2xl bg-black/[.03] p-3 text-center"><p className="font-display text-xl font-bold">{Number(v).toLocaleString()}</p><p className="text-xs text-ink/45">{l}</p></div>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">{badges.map(b=><span key={b.code} className="rounded-full bg-sun/15 px-3 py-2 text-sm">{b.icon} {b.name_th}</span>)}</div>
        <Link href="/vs" className="mt-5 inline-flex rounded-xl bg-plum px-4 py-2 text-sm font-medium text-white">ไป Challenge ใน VS</Link>
      </FadeIn>
    </div>
  </main>;
}
