"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import GlassButton from "@/components/ui/GlassButton";
import { createClient } from "@/lib/supabase/client";

type Match = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  status:
    | "pending"
    | "active"
    | "completed"
    | "cancelled"
    | "disputed";
  duration_seconds: number;
};

export default function VsPage() {
  const router = useRouter();

  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");

  async function findRandomMatch() {
    if (loading) return;

    setLoading(true);
    setError("");

    const { data, error } = await supabase.rpc(
      "find_or_create_random_match"
    );

    if (error) {
      console.error("Matchmaking error:", error);
      setError("ไม่สามารถหาคู่แข่งได้ กรุณาลองใหม่");
      setLoading(false);
      return;
    }

    const newMatch = data as Match;

    setMatch(newMatch);

    // ถ้าจับคู่สำเร็จแล้ว
    if (newMatch.status === "active") {
      router.push(`/vs/${newMatch.id}`);
      return;
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!match?.id) return;

    const channel = supabase
      .channel(`vs-match-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vs_matches",
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          const updatedMatch = payload.new as Match;

          setMatch(updatedMatch);

          // มีคู่แข่งเข้ามาแล้ว
          if (updatedMatch.status === "active") {
            router.push(`/vs/${updatedMatch.id}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match?.id, router, supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="font-display text-3xl font-bold text-plum-deep">
        ท้าแข่งวิดพื้น
      </h1>

      <p className="max-w-md text-center text-ink/60">
        เลือกคู่แข่ง แล้วทั้งคู่วิดพื้นในเวลาที่กำหนด
        ใครทำได้มากกว่าและถูกท่าชนะ
      </p>

      <div className="glass grid w-full max-w-md gap-4 rounded-[24px] p-6 text-center">
        {!match && (
          <>
            <p className="font-display font-semibold text-plum-deep">
              พร้อมท้าคนอื่นหรือยัง?
            </p>

            <GlassButton
              variant="plum"
              onClick={findRandomMatch}
              disabled={loading}
            >
              {loading
                ? "กำลังค้นหาคู่แข่ง..."
                : "🎲 หาคู่แข่งแบบสุ่ม"}
            </GlassButton>

            <GlassButton variant="ghost">
              🔗 ท้าเพื่อนด้วยลิงก์
            </GlassButton>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}
          </>
        )}

        {match?.status === "pending" && (
          <>
            <div className="text-5xl">⚔️</div>

            <p className="font-display text-lg font-semibold text-plum-deep">
              กำลังค้นหาคู่แข่ง...
            </p>

            <p className="text-sm text-ink/60">
              ระบบกำลังหาคนที่พร้อมแข่งกับคุณ
            </p>

            <div className="mx-auto h-2 w-2/3 overflow-hidden rounded-full bg-black/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-plum-deep" />
            </div>
          </>
        )}
      </div>
    </main>
  );
}