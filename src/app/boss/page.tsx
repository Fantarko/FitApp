import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";

type Boss = {
  id: string;
  stage: number;
  name_th: string;
  hp: number;
  icon: string;
  icon_url: string | null;
};

type BossProgress = {
  boss_id: string;
  defeated_at: string | null;
  best_reps_used: number | null;
};

export default async function BossListPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: bosses } = await supabase
    .from("bosses")
    .select("id, stage, name_th, hp, icon, icon_url")
    .order("stage", { ascending: true });

  const list = (bosses ?? []) as Boss[];

  let defeatedBossIds = new Set<string>();
  let progress: BossProgress[] = [];

  if (user && list.length > 0) {
    const { data } = await supabase
      .from("user_boss_progress")
      .select("boss_id, defeated_at, best_reps_used")
      .eq("user_id", user.id)
      .not("defeated_at", "is", null);

    progress = (data ?? []) as BossProgress[];

    defeatedBossIds = new Set(
      progress.map((p: BossProgress) => p.boss_id)
    );
  }

  const progressMap = new Map(
    progress.map((p: BossProgress) => [p.boss_id, p])
  );

  const defeatedCount = defeatedBossIds.size;
  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center overflow-hidden px-6 py-10">
      {/* Animated background */}
      <BlobBackground colors={["var(--color-sun)", "var(--color-plum)"]} />

      {/* Header */}
      <div className="animate-fade-in mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-sun/10 px-4 py-2 text-xs font-bold tracking-wider text-sun-deep">
            BOSS MODE
          </span>
        </div>

        <h1 className="animate-slide-up font-display text-3xl font-bold text-sun-deep md:text-4xl">
          โหมดปราบบอส
        </h1>

        <div className="mt-4 flex justify-center gap-2">
          <span className="rounded-full bg-primary-tint px-3 py-1 text-xs font-semibold text-primary-deep">ปลดล็อก {defeatedCount}/{list.length}</span>
          <Link href="/boss/history" className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-ink/60">ประวัติ Boss</Link>
        </div>

        <p
          className="animate-slide-up mx-auto mt-3 max-w-md text-center leading-6 text-ink/60"
          style={{ animationDelay: "120ms" }}
        >
          วิดพื้นแต่ละครั้งคือการโจมตี
          <br />
          ปราบบอสให้ได้ก่อนหมดแรงเพื่อปลดล็อกด่านถัดไป
        </p>
      </div>

      {/* Boss list */}
      <div className="grid w-full max-w-md gap-3">
        {list.map((boss, i) => {
          const defeated = defeatedBossIds.has(boss.id);

          const prevDefeated =
            i === 0 ||
            defeatedBossIds.has(list[i - 1].id);

          const locked = !prevDefeated;

          const card = (
            <div
              className={`
                glass
                animate-slide-up
                group
                flex
                items-center
                justify-between
                rounded-[20px]
                p-4
                transition-all
                duration-300

                ${
                  locked
                    ? "opacity-50"
                    : "hover:-translate-y-1 hover:shadow-xl hover:shadow-sun/10"
                }

                ${
                  defeated
                    ? "border-primary/20"
                    : ""
                }
              `}
              style={{
                animationDelay: `${200 + i * 90}ms`,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Boss character */}
                <span
                  className={`
                    flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-3xl
                    transition-transform
                    duration-300
                    ${
                      !locked
                        ? "group-hover:scale-110"
                        : ""
                    }
                  `}
                >
                  {locked ? (
                    "🔒"
                  ) : boss.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={boss.icon_url} alt={boss.name_th} className="h-full w-full object-cover" />
                  ) : (
                    boss.icon
                  )}
                </span>

                <div className="text-left">
                  <p className="font-display font-semibold">
                    ด่าน {boss.stage}: {boss.name_th}
                  </p>

                  <p className="mt-1 text-xs text-ink/50">
                    HP {boss.hp} · รางวัล {boss.hp} XP
                  </p>
                  {defeated && <p className="mt-1 text-[11px] font-medium text-primary-deep">Best {progressMap.get(boss.id)?.best_reps_used ?? "—"} ครั้ง</p>}
                </div>
              </div>

              {defeated && (
                <span className="text-sm font-medium text-primary-deep">
                  ปราบแล้ว
                </span>
              )}
            </div>
          );

          return locked || !user ? (
            <div key={boss.id}>{card}</div>
          ) : (
            <Link
              key={boss.id}
              href={`/boss/${boss.stage}`}
              className="block"
            >
              {card}
            </Link>
          );
        })}
      </div>
    </main>
  );
}