"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import PushupCamera from "@/components/PushupCamera";

export default function VsMatchPage() {
  const params = useParams();
  const router = useRouter();

  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    const id = params.matchId;

    if (typeof id === "string" && id.length > 0) {
      setMatchId(id);
      return;
    }

    if (Array.isArray(id) && id.length > 0) {
      setMatchId(id[0]);
      return;
    }

    setMatchId(null);
  }, [params.matchId]);

  // กำลังอ่าน Match ID
  if (!matchId) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="glass w-full max-w-md rounded-[28px] p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-plum-deep">
            กำลังเตรียมการแข่งขัน...
          </h1>

          <p className="mt-3 text-sm text-ink/60">
            กำลังโหลดข้อมูลการแข่งขัน
          </p>

          <div className="mx-auto mt-6 h-2 w-40 overflow-hidden rounded-full bg-black/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-plum-deep" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-6 w-full max-w-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 text-sm text-ink/50 transition hover:text-ink"
        >
          ← กลับ
        </button>

        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-plum-deep/70">
            VS MATCH
          </p>

          <h1 className="mt-2 font-display text-3xl font-bold text-plum-deep">
            เตรียมตัวให้พร้อม
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink/60">
            เตรียมท่าวิดพื้นให้พร้อม
            <br />
            เมื่อเริ่มการแข่งขัน พยายามทำให้ได้มากที่สุด
          </p>
        </div>
      </div>

      {/* Match information */}
      <div className="glass mb-5 w-full max-w-2xl rounded-[24px] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ink/40">
              MATCH ID
            </p>

            <p className="mt-1 max-w-[220px] truncate font-mono text-sm font-medium text-plum-deep">
              {matchId}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-black/5 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

            <span className="text-xs font-medium text-ink/60">
              พร้อมแข่งขัน
            </span>
          </div>
        </div>
      </div>

      {/* Camera */}
      <div className="w-full max-w-2xl">
        <PushupCamera
          mode="vs"
          matchId={matchId}
        />
      </div>
    </main>
  );
}