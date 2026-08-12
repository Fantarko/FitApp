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
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="font-display text-2xl font-bold text-sun-deep">
        ด่าน {boss.stage}: {boss.name_th}
      </h1>
      <BossBattleCamera boss={boss} />
    </main>
  );
}
