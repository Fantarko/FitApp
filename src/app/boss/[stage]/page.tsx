import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BossBattleCamera from "@/components/BossBattleCamera";

export default async function BossBattlePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  const stageNum = Number(stage);

  const supabase = await createClient();

  const { data: boss } = await supabase
    .from("bosses")
    .select("id, stage, name_th, hp, icon")
    .eq("stage", stageNum)
    .single();

  if (!boss) notFound();

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-10">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-float absolute -left-32 top-10 h-80 w-80 rounded-full bg-sun/15 blur-3xl" />

        <div className="animate-float-slow absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="animate-float absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-plum/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="animate-fade-in mb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sun-deep/70">
          BOSS BATTLE
        </p>

        <h1 className="mt-2 font-display text-3xl font-bold text-sun-deep md:text-4xl">
          ด่าน {boss.stage}: {boss.name_th}
        </h1>

        <div className="mx-auto mt-4 h-1 w-16 overflow-hidden rounded-full bg-sun/20">
          <div className="h-full w-full origin-left animate-pulse rounded-full bg-sun-deep" />
        </div>
      </div>

      {/* Battle area */}
      <div className="animate-slide-up w-full max-w-3xl">
        <BossBattleCamera boss={boss} />
      </div>
    </main>
  );
}