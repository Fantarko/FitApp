import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BossBattleCamera from "@/components/BossBattleCamera";
import BlobBackground from "@/components/BlobBackground";

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
    .select("id, stage, name_th, hp, icon, icon_url")
    .eq("stage", stageNum)
    .single();

  if (!boss) notFound();

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-10">
      {/* Animated background */}
      <BlobBackground colors={["var(--color-sun)", "var(--color-primary)"]} />

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