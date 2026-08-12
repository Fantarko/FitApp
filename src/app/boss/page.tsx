import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Boss = {
  id: string;
  stage: number;
  name_th: string;
  hp: number;
  icon: string;
};

export default async function BossListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bosses } = await supabase
    .from("bosses")
    .select("id, stage, name_th, hp, icon")
    .order("stage", { ascending: true });

  const list = (bosses ?? []) as Boss[];

  let defeatedBossIds = new Set<string>();
  if (user && list.length > 0) {
    const { data: progress } = await supabase
      .from("user_boss_progress")
      .select("boss_id, defeated_at")
      .eq("user_id", user.id)
      .not("defeated_at", "is", null);
    defeatedBossIds = new Set((progress ?? []).map((p) => p.boss_id as string));
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-sun/20 blur-3xl" />
      </div>

      <h1 className="font-display text-3xl font-bold text-sun-deep">🐉 โหมดปราบบอส</h1>
      <p className="max-w-md text-center text-ink/60">
        วิดพื้นแต่ละครั้งคือการโจมตี ปราบบอสให้ได้ก่อนหมดแรงเพื่อปลดล็อกด่านถัดไป
      </p>

      <div className="grid w-full max-w-md gap-3">
        {list.map((boss, i) => {
          const defeated = defeatedBossIds.has(boss.id);
          const prevDefeated = i === 0 || defeatedBossIds.has(list[i - 1].id);
          const locked = !prevDefeated;

          const card = (
            <div
              className={`glass flex items-center justify-between rounded-[20px] p-4 ${
                locked ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{locked ? "🔒" : boss.icon}</span>
                <div className="text-left">
                  <p className="font-display font-semibold">
                    ด่าน {boss.stage}: {boss.name_th}
                  </p>
                  <p className="text-xs text-ink/50">HP {boss.hp}</p>
                </div>
              </div>
              {defeated && <span className="text-sm font-medium text-primary-deep">✅ ปราบแล้ว</span>}
            </div>
          );

          return locked || !user ? (
            <div key={boss.id}>{card}</div>
          ) : (
            <Link key={boss.id} href={`/boss/${boss.stage}`}>
              {card}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
