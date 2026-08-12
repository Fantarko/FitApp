"use client";

import { useEffect, useRef, useState } from "react";
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

  // เก็บ match ปัจจุบันไว้ใน ref ให้ cleanup อ่านค่าล่าสุดได้เสมอ
  // (ไม่ใช้ useEffect cleanup ปกติ เพราะ effect ตัวจับ match นี้รันแค่ตอน mount)
  const matchRef = useRef<Match | null>(null);
  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  /**
   * หาคู่แข่งแบบสุ่ม
   */
  async function findRandomMatch() {
    if (loading) return;

    setLoading(true);
    setError("");

    console.log("เริ่มค้นหาคู่แข่ง...");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "find_or_create_random_match"
      );

      console.log("📦 RPC result:", data);
      console.log("❌ RPC error:", rpcError);

      if (rpcError) {
        console.error("Matchmaking error:", rpcError);

        setError(
          rpcError.message || "ไม่สามารถหาคู่แข่งได้ กรุณาลองใหม่"
        );

        setLoading(false);
        return;
      }

      if (!data) {
        console.error("RPC ไม่ได้ส่งข้อมูล match กลับมา");

        setError("ระบบไม่พบข้อมูลการแข่งขัน");
        setLoading(false);
        return;
      }

      /**
       * Supabase RPC อาจคืน object หรือ array
       * รองรับทั้งสองแบบ
       */
      const newMatch = (Array.isArray(data) ? data[0] : data) as Match;

      if (!newMatch?.id) {
        console.error("ข้อมูล Match ไม่ถูกต้อง:", newMatch);

        setError("ข้อมูลการแข่งขันไม่ถูกต้อง");
        setLoading(false);
        return;
      }

      console.log("Match:", newMatch);

      setMatch(newMatch);

      /**
       * ถ้ามีคู่แข่งแล้ว
       */
      if (newMatch.status === "active") {
        console.log(
          "จับคู่สำเร็จทันที:",
          newMatch.id
        );

        router.push(`/vs/${newMatch.id}`);
        return;
      }

      /**
       * ถ้ายังไม่มีคู่แข่ง
       */
      if (newMatch.status === "pending") {
        console.log(
          "สร้าง Match แล้ว กำลังรอคู่แข่ง:",
          newMatch.id
        );
      }

      setLoading(false);
    } catch (err) {
      console.error("Unexpected matchmaking error:", err);

      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");

      setLoading(false);
    }
  }

  /**
   * Realtime
   *
   * เมื่อคู่แข่งคนที่ 2 เข้ามา
   * Database จะเปลี่ยน pending -> active
   *
   * แล้ว Supabase Realtime จะส่ง UPDATE มาที่นี่
   */
  useEffect(() => {
    if (!match?.id) return;

    console.log(
      "🔌 กำลังเชื่อม Realtime สำหรับ Match:",
      match.id
    );

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
          console.log("REALTIME UPDATE:", payload);

          const updatedMatch = payload.new as Match;

          if (!updatedMatch?.id) {
            console.error(
              "Realtime ส่งข้อมูล Match ไม่ถูกต้อง:",
              payload
            );

            return;
          }

          console.log(
            "Match status:",
            updatedMatch.status
          );

          setMatch(updatedMatch);

          /**
           * จับคู่สำเร็จ
           */
          if (updatedMatch.status === "active") {
            console.log(
              "จับคู่สำเร็จ! กำลังเข้าแข่งขัน:",
              updatedMatch.id
            );

            router.push(`/vs/${updatedMatch.id}`);
          }
        }
      )
      .subscribe((status) => {
        console.log(
          `Realtime status (${match.id}):`,
          status
        );

        if (status === "SUBSCRIBED") {
          console.log(
            "Realtime เชื่อมต่อสำเร็จ!"
          );
        }

        if (status === "CHANNEL_ERROR") {
          console.error(
            "Realtime CHANNEL_ERROR"
          );

          setError(
            "ไม่สามารถเชื่อมต่อระบบจับคู่แบบ Realtime ได้"
          );
        }

        if (status === "TIMED_OUT") {
          console.error(
            "Realtime connection timeout"
          );

          setError(
            "การเชื่อมต่อระบบจับคู่หมดเวลา กรุณาลองใหม่"
          );
        }
      });

    /**
     * Cleanup
     */
    return () => {
      console.log(
        "ปิด Realtime:",
        match.id
      );

      supabase.removeChannel(channel);
    };
  }, [match?.id, router, supabase]);

  /**
   * ★ ใหม่: ยกเลิก match ที่ยัง pending อยู่ ถ้าผู้ใช้ออกจากหน้านี้
   * ครอบทั้งกรณี:
   *  - เดินไปหน้าอื่นในแอป (SPA navigation) → cleanup ตอน unmount
   *  - ปิดแท็บ/รีเฟรช → beforeunload (ไม่การันตีส่งสำเร็จ 100%
   *    แต่ช่วยลดเคสได้เยอะ — จุดกันสุดท้ายคือ staleness check ฝั่ง RPC)
   */
  useEffect(() => {
    function cancelPendingMatch() {
      const m = matchRef.current;
      if (m && m.status === "pending") {
        console.log("ยกเลิก pending match ที่ค้างอยู่:", m.id);
        supabase
          .from("vs_matches")
          .update({ status: "cancelled" })
          .eq("id", m.id)
          .eq("status", "pending") // กันแก้ทับ match ที่เพิ่ง active ไปแล้ว
          .then();
      }
    }

    window.addEventListener("beforeunload", cancelPendingMatch);
    return () => {
      window.removeEventListener("beforeunload", cancelPendingMatch);
      cancelPendingMatch();
    };
  }, [supabase]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-plum-deep">
          ท้าแข่งวิดพื้น
        </h1>

        <p className="mt-3 max-w-md text-center text-ink/60">
          เลือกคู่แข่ง แล้วทั้งคู่วิดพื้นในเวลาที่กำหนด
          ใครทำได้มากกว่าและถูกท่าชนะ
        </p>
      </div>

      <div className="glass grid w-full max-w-md gap-4 rounded-[24px] p-6 text-center">
        {/* ยังไม่ได้สร้าง Match */}
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
                : "หาคู่แข่งแบบสุ่ม"}
            </GlassButton>

            <GlassButton
              variant="ghost"
              disabled={loading}
            >
              ท้าเพื่อนด้วยลิงก์
            </GlassButton>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}
          </>
        )}

        {/* กำลังรอคู่แข่ง */}
        {match?.status === "pending" && (
          <>
            <p className="font-display text-lg font-semibold text-plum-deep">
              กำลังค้นหาคู่แข่ง...
            </p>

            <p className="text-sm text-ink/60">
              ระบบกำลังหาคนที่พร้อมแข่งกับคุณ
            </p>

            <div className="mx-auto h-2 w-2/3 overflow-hidden rounded-full bg-black/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-plum-deep" />
            </div>

            <p className="text-xs text-ink/40">
              Match ID: {match.id}
            </p>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}
          </>
        )}

        {/* กำลังเข้าสู่การแข่งขัน */}
        {match?.status === "active" && (
          <>
            <p className="font-display text-lg font-semibold text-plum-deep">
              จับคู่สำเร็จ!
            </p>

            <p className="text-sm text-ink/60">
              กำลังเข้าสู่การแข่งขัน...
            </p>
          </>
        )}

        {/* Match ถูกยกเลิก */}
        {match?.status === "cancelled" && (
          <>
            <p className="font-display text-lg font-semibold text-plum-deep">
              การแข่งขันถูกยกเลิก
            </p>

            <GlassButton
              variant="plum"
              onClick={() => {
                setMatch(null);
                setError("");
              }}
            >
              ลองใหม่
            </GlassButton>
          </>
        )}

        {/* Match มีปัญหา */}
        {match?.status === "disputed" && (
          <>
            <div className="text-5xl">⚠️</div>

            <p className="font-display text-lg font-semibold text-plum-deep">
              การแข่งขันมีข้อพิพาท
            </p>

            <GlassButton
              variant="plum"
              onClick={() => {
                setMatch(null);
                setError("");
              }}
            >
              กลับ
            </GlassButton>
          </>
        )}
      </div>
    </main>
  );
}