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
  invite_code: string | null;
};

function randomInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function VsPage() {
  const router = useRouter();

  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function createInviteMatch() {
    if (inviteLoading || loading) return;
    setInviteLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("กรุณาเข้าสู่ระบบก่อนแข่งขัน");
      setInviteLoading(false);
      return;
    }

    const code = randomInviteCode();
    const { data, error: insertError } = await supabase
      .from("vs_matches")
      .insert({
        challenger_id: user.id,
        invite_code: code,
        duration_seconds: 60,
        status: "pending",
      })
      .select("id, challenger_id, opponent_id, status, duration_seconds, invite_code")
      .single();

    if (insertError || !data) {
      setError(insertError?.message || "สร้างลิงก์ท้าแข่งไม่สำเร็จ");
      setInviteLoading(false);
      return;
    }

    setMatch(data as Match);
    setInviteLoading(false);
  }

  async function copyInviteLink() {
    if (!match?.invite_code) return;
    const url = `${window.location.origin}/vs/invite/${match.invite_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("คัดลอกลิงก์ไม่สำเร็จ ลองคัดลอกเองจากช่องด้านบน");
    }
  }

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
  <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">

    {/* =========================
        Animated Background
    ========================= */}
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="animate-float absolute -left-32 -top-20 h-80 w-80 rounded-full bg-plum/15 blur-3xl" />

      <div className="animate-float-slow absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />

      <div className="animate-float absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sun/10 blur-3xl" />
    </div>

    {/* =========================
        Header
    ========================= */}
    <div className="animate-fade-in mb-8 text-center">
      <h1 className="font-display text-3xl font-bold text-plum-deep md:text-4xl">
        ท้าแข่งวิดพื้น
      </h1>
      <p className="animate-slide-up mt-3 max-w-md text-center text-ink/60">
        เลือกคู่แข่ง แล้วทั้งคู่วิดพื้นในเวลาที่กำหนด
        <br />
        ใครทำได้มากกว่าและถูกท่าชนะ
      </p>
    </div>
    {/* =========================
        Main Match Card
    ========================= */}
    <div className="animate-slide-up glass grid w-full max-w-md gap-4 rounded-[24px] p-6 text-center shadow-xl">

      {/* =========================
          ยังไม่ได้สร้าง Match
      ========================= */}
      {!match && (
        <div className="animate-fade-in grid gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-plum-deep">
              พร้อมท้าคนอื่นหรือยัง?
            </p>

            <p className="mt-1 text-sm text-ink/50">
              ระบบจะสุ่มผู้เล่นที่กำลังรอแข่งให้คุณ
            </p>
          </div>

          {/* Random Match */}
          <GlassButton
            variant="plum"
            onClick={findRandomMatch}
            disabled={loading}
            className="transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                กำลังค้นหาคู่แข่ง...
              </span>
            ) : (
              "หาคู่แข่งแบบสุ่ม"
            )}
          </GlassButton>

          {/* Invite Friend */}
          <GlassButton
            variant="ghost"
            onClick={createInviteMatch}
            disabled={loading || inviteLoading}
            className="transition-all duration-200 hover:scale-[1.02]"
          >
            {inviteLoading ? "กำลังสร้างลิงก์..." : "ท้าเพื่อนด้วยลิงก์"}
          </GlassButton>

          {error && (
            <div className="animate-fade-in rounded-xl bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-500">
                {error}
              </p>
            </div>
          )}

        </div>
      )}

      {/* =========================
          กำลังรอคู่แข่ง
      ========================= */}
      {match?.status === "pending" && (
        <div className="animate-fade-in grid gap-4">
          <div>
            <p className="font-display text-xl font-bold text-plum-deep">
              {match.invite_code ? "รอเพื่อนกดลิงก์..." : "กำลังค้นหาคู่แข่ง..."}
            </p>

            <p className="mt-1 text-sm text-ink/60">
              {match.invite_code
                ? "ส่งลิงก์นี้ให้เพื่อน พอเขากดปุ๊บจะเริ่มแข่งทันที"
                : "ระบบกำลังหาคนที่พร้อมแข่งกับคุณ"}
            </p>
          </div>

          {/* Searching animation */}
          <div className="mx-auto w-full max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-black/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-plum-deep" />
            </div>
          </div>

          {/* Live searching indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-plum-deep">
            <span className="h-2 w-2 animate-ping rounded-full bg-plum-deep" />
            <span>{match.invite_code ? "รอเพื่อนอยู่..." : "กำลังสแกนหาคู่แข่ง..."}</span>
          </div>

          {match.invite_code && (
            <div className="rounded-xl bg-black/5 px-3 py-3">
              <p className="text-xs text-ink/40">ลิงก์ท้าแข่ง</p>
              <p className="mt-1 break-all font-mono text-xs text-plum-deep">
                {`${typeof window !== "undefined" ? window.location.origin : ""}/vs/invite/${match.invite_code}`}
              </p>
              <GlassButton
                variant="ghost"
                onClick={copyInviteLink}
                className="mt-2 w-full text-sm"
              >
                {copied ? "คัดลอกแล้ว ✓" : "📋 คัดลอกลิงก์"}
              </GlassButton>
            </div>
          )}

          {/* Match ID */}
          <div className="rounded-xl bg-black/5 px-3 py-2">
            <p className="text-xs text-ink/40">
              Match ID
            </p>

            <p className="mt-1 break-all font-mono text-xs text-ink/60">
              {match.id}
            </p>
          </div>

          {error && (
            <div className="animate-fade-in rounded-xl bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-500">
                {error}
              </p>
            </div>
          )}

        </div>
      )}

      {/* =========================
          จับคู่สำเร็จ
      ========================= */}
      {match?.status === "active" && (
        <div className="animate-fade-in flex flex-col items-center gap-4">
          <div>
            <p className="font-display text-2xl font-bold text-plum-deep">
              จับคู่สำเร็จ!
            </p>

            <p className="mt-1 text-sm text-ink/60">
              พบคู่แข่งแล้ว
            </p>
          </div>

          {/* Loading into VS */}
          <div className="mt-2 flex items-center gap-2 text-sm text-plum-deep">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-plum/30 border-t-plum-deep" />
            กำลังเข้าสู่การแข่งขัน...
          </div>

        </div>
      )}

      {/* =========================
          Match ถูกยกเลิก
      ========================= */}
      {match?.status === "cancelled" && (
        <div className="animate-fade-in grid gap-4">
          <div>
            <p className="font-display text-xl font-bold text-plum-deep">
              การแข่งขันถูกยกเลิก
            </p>

            <p className="mt-1 text-sm text-ink/60">
              คู่แข่งออกจากการค้นหาก่อนจับคู่
            </p>
          </div>

          <GlassButton
            variant="plum"
            onClick={() => {
              setMatch(null);
              setError("");
            }}
            className="transition-all duration-200 hover:scale-[1.03]"
          >
            ลองใหม่
          </GlassButton>

        </div>
      )}

      {/* =========================
          Match มีปัญหา
      ========================= */}
      {match?.status === "disputed" && (
        <div className="animate-fade-in grid gap-4">

          <div className="animate-medal text-5xl">
            ⚠️
          </div>

          <div>
            <p className="font-display text-xl font-bold text-plum-deep">
              การแข่งขันมีข้อพิพาท
            </p>

            <p className="mt-1 text-sm text-ink/60">
              ระบบตรวจพบปัญหาในการแข่งขัน
            </p>
          </div>

          <GlassButton
            variant="plum"
            onClick={() => {
              setMatch(null);
              setError("");
            }}
            className="transition-all duration-200 hover:scale-[1.03]"
          >
            ← กลับ
          </GlassButton>

        </div>
      )}

    </div>
  </main>
);
}