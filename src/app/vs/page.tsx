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

    console.log("🎲 เริ่มค้นหาคู่แข่ง...");

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

      console.log("⚔️ Match:", newMatch);

      setMatch(newMatch);

      /**
       * ถ้ามีคู่แข่งแล้ว
       */
      if (newMatch.status === "active") {
        console.log(
          "🔥 จับคู่สำเร็จทันที:",
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
          "⏳ สร้าง Match แล้ว กำลังรอคู่แข่ง:",
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
          console.log("🔥 REALTIME UPDATE:", payload);

          const updatedMatch = payload.new as Match;

          if (!updatedMatch?.id) {
            console.error(
              "Realtime ส่งข้อมูล Match ไม่ถูกต้อง:",
              payload
            );

            return;
          }

          console.log(
            "📊 Match status:",
            updatedMatch.status
          );

          setMatch(updatedMatch);

          /**
           * จับคู่สำเร็จ
           */
          if (updatedMatch.status === "active") {
            console.log(
              "⚔️ จับคู่สำเร็จ! กำลังเข้าแข่งขัน:",
              updatedMatch.id
            );

            router.push(`/vs/${updatedMatch.id}`);
          }
        }
      )
      .subscribe((status) => {
        console.log(
          `📡 Realtime status (${match.id}):`,
          status
        );

        if (status === "SUBSCRIBED") {
          console.log(
            "✅ Realtime เชื่อมต่อสำเร็จ!"
          );
        }

        if (status === "CHANNEL_ERROR") {
          console.error(
            "❌ Realtime CHANNEL_ERROR"
          );

          setError(
            "ไม่สามารถเชื่อมต่อระบบจับคู่แบบ Realtime ได้"
          );
        }

        if (status === "TIMED_OUT") {
          console.error(
            "⏰ Realtime connection timeout"
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
        "🔌 ปิด Realtime:",
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
        console.log("🧹 ยกเลิก pending match ที่ค้างอยู่:", m.id);
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
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">

            {/* Header */}
            <div className="mb-8 text-center">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-plum-deep/60">
                VS MATCH
              </p>

              <h1 className="font-display text-3xl font-bold tracking-tight text-plum-deep">
                ท้าแข่งวิดพื้น
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink/55">
                เลือกคู่แข่ง แล้ววัดจำนวนวิดพื้นที่ถูกต้อง
                <br />
                ใครทำได้มากกว่าจะเป็นผู้ชนะ
              </p>
            </div>

            {/* Main Card */}
            <div
              className="
                w-full
                rounded-[24px]
                border
                border-black/[0.07]
                bg-white/45
                p-6
                shadow-sm
                backdrop-blur-xl
              "
            >

              {/* =====================================
                  ยังไม่ได้สร้าง Match
              ====================================== */}

              {!match && (
                <div className="space-y-5">

                  <div className="text-center">
                    <p className="font-display text-lg font-semibold text-plum-deep">
                      พร้อมท้าคู่แข่งหรือยัง?
                    </p>

                    <p className="mt-1.5 text-xs text-ink/40">
                      ระบบจะค้นหาคนที่กำลังรอการแข่งขัน
                    </p>
                  </div>

                  <div className="space-y-3">

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

                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-500/10 bg-red-500/[0.05] px-4 py-3">
                      <p className="text-center text-xs leading-5 text-red-500">
                        {error}
                      </p>
                    </div>
                  )}

                </div>
              )}

              {/* =====================================
                  กำลังรอคู่แข่ง
              ====================================== */}

              {match?.status === "pending" && (
                <div className="space-y-5 text-center">

                  {/* Status indicator */}
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-plum-deep/10 bg-plum-deep/[0.04]">
                    <span className="h-3 w-3 animate-pulse rounded-full bg-plum-deep" />
                  </div>

                  <div>
                    <p className="font-display text-lg font-semibold text-plum-deep">
                      กำลังค้นหาคู่แข่ง
                    </p>

                    <p className="mt-1.5 text-sm leading-6 text-ink/55">
                      ระบบกำลังหาคนที่พร้อมแข่งขันกับคุณ
                    </p>
                  </div>

                  {/* Loading */}
                  <div className="mx-auto w-full max-w-[240px]">
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-plum-deep/70" />
                    </div>
                  </div>

                  {/* Match ID */}
                  <div className="rounded-xl bg-black/[0.025] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/30">
                      Match ID
                    </p>

                    <p className="mt-1 truncate font-mono text-xs text-ink/55">
                      {match.id}
                    </p>
                  </div>

                  {error && (
                    <p className="text-xs text-red-500">
                      {error}
                    </p>
                  )}

                </div>
              )}

              {/* =====================================
                  จับคู่สำเร็จ
              ====================================== */}

              {match?.status === "active" && (
                <div className="space-y-5 text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-green-500/10 bg-green-500/[0.06]">
                    <span className="text-lg font-semibold text-green-600">
                      ✓
                    </span>
                  </div>

                  <div>
                    <p className="font-display text-lg font-semibold text-plum-deep">
                      จับคู่สำเร็จ
                    </p>

                    <p className="mt-1.5 text-sm text-ink/55">
                      กำลังเข้าสู่การแข่งขัน...
                    </p>
                  </div>

                  <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-black/[0.06]">
                    <div className="h-full w-full animate-pulse rounded-full bg-green-500/60" />
                  </div>

                </div>
              )}

              {/* =====================================
                  Match ถูกยกเลิก
              ====================================== */}

              {match?.status === "cancelled" && (
                <div className="space-y-5 text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03]">
                    <span className="text-lg font-semibold text-ink/50">
                      —
                    </span>
                  </div>

                  <div>
                    <p className="font-display text-lg font-semibold text-plum-deep">
                      การแข่งขันถูกยกเลิก
                    </p>

                    <p className="mt-1.5 text-sm leading-6 text-ink/50">
                      ไม่สามารถเริ่มการแข่งขันนี้ได้
                    </p>
                  </div>

                  <GlassButton
                    variant="plum"
                    onClick={() => {
                      setMatch(null);
                      setError("");
                    }}
                  >
                    ลองใหม่
                  </GlassButton>

                </div>
              )}

              {/* =====================================
                  Match มีข้อพิพาท
              ====================================== */}

              {match?.status === "disputed" && (
                <div className="space-y-5 text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/10 bg-amber-500/[0.05]">
                    <span className="text-lg font-semibold text-amber-600">
                      !
                    </span>
                  </div>

                  <div>
                    <p className="font-display text-lg font-semibold text-plum-deep">
                      การแข่งขันมีข้อพิพาท
                    </p>

                    <p className="mt-1.5 text-sm leading-6 text-ink/50">
                      ระบบไม่สามารถยืนยันผลการแข่งขันได้
                    </p>
                  </div>

                  <GlassButton
                    variant="plum"
                    onClick={() => {
                      setMatch(null);
                      setError("");
                    }}
                  >
                    กลับ
                  </GlassButton>

                </div>
              )}

            </div>

            {/* Footer hint */}
            {!match && !loading && (
              <p className="mt-5 text-center text-[11px] text-ink/30">
                การแข่งขันจะเริ่มเมื่อพบคู่แข่งที่พร้อม
              </p>
            )}

          </div>
        </main>
      );

}