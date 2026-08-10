"use client";

import { useParams } from "next/navigation";
import PushupCamera from "@/components/PushupCamera";

export default function VsMatchPage() {
  const params = useParams();

  const matchId = params.matchId as string;

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 py-10">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-ink/50">
          VS MATCH
        </p>

        <h1 className="mt-2 font-display text-3xl font-bold text-plum-deep">
          เตรียมตัวให้พร้อม
        </h1>
      </div>

      <PushupCamera
        mode="vs"
        matchId={matchId}
      />
    </main>
  );
}