import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/achievements");
  const [{ data: badges }, { data: earned }] = await Promise.all([
    supabase.from("badges").select("code, icon, name_th").order("code"),
    supabase.from("user_badges").select("badge_id, badges(code)").eq("user_id", user.id),
  ]);
  const earnedCodes = new Set((earned ?? []).map((x) => (x.badges as unknown as { code: string } | null)?.code).filter(Boolean));
  return <main className="relative flex-1 overflow-hidden px-6 py-10 md:px-10"><BlobBackground colors={["var(--color-sun)", "var(--color-plum)"]}/><div className="mx-auto max-w-4xl"><FadeIn><h1 className="font-display text-3xl font-bold text-primary-deep">ความสำเร็จ</h1><p className="mt-1 text-sm text-ink/50">สะสม Badge และปลดล็อกความสำเร็จ</p></FadeIn><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(badges ?? []).map((b) => { const done = earnedCodes.has(b.code); return <FadeIn key={b.code} className={`rounded-[22px] p-5 ${done ? "glass" : "bg-white/35 opacity-60"}`}><div className="text-4xl">{b.icon}</div><div className="mt-3 flex items-center justify-between gap-2"><h2 className="font-display font-semibold">{b.name_th}</h2>{done && <span className="text-xs text-primary-deep">ได้รับแล้ว ✓</span>}</div><p className="mt-2 text-sm leading-6 text-ink/55">{"ทำภารกิจเพื่อปลดล็อก Badge นี้"}</p></FadeIn>})}</div>{!badges?.length && <div className="glass mt-6 rounded-[24px] p-8 text-center text-sm text-ink/45">ยังไม่มีข้อมูล Badge ในฐานข้อมูล</div>}</div></main>;
}
