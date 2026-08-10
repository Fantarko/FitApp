"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import GlassButton from "@/components/ui/GlassButton";
import RepRing from "@/components/ui/RepRing";
import { PushupCounter, type Landmark } from "@/lib/pose/pushupCounter";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "ready" | "running" | "saving" | "done" | "error";

type PushupCameraProps = {
  mode?: "solo" | "vs";
  matchId?: string;
};

type VsMatch = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  challenger_reps: number;
  opponent_reps: number;
  status: "pending" | "active" | "completed" | "cancelled" | "disputed";
};

const GOAL = 30;
// keep the server-side log light: one sample every N processed frames
const LOG_SAMPLE_INTERVAL = 15;

export default function PushupCamera({
  mode = "solo",
  matchId,
}: PushupCameraProps) {
  // 3) Supabase client ตัวเดียวต่อ component
  const [supabase] = useState(() => createClient());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const counterRef = useRef(new PushupCounter());
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const frameIndexRef = useRef(0);
  const logRef = useRef<{ t: number; landmarks: Landmark[] }[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [reps, setReps] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const [vsRole, setVsRole] = useState<"challenger" | "opponent" | null>(null);
  const [vsReady, setVsReady] = useState(false);
  // 6) คะแนนของคู่แข่ง (รับผ่าน Realtime)
  const [opponentReps, setOpponentReps] = useState(0);

  const vsRoleRef = useRef<"challenger" | "opponent" | null>(null);
  const vsReadyRef = useRef(false);

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  async function ensureLandmarker() {
    if (landmarkerRef.current) return landmarkerRef.current;
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    landmarkerRef.current = landmarker;
    return landmarker;
  }

  function drawSkeleton(result: PoseLandmarkerResult, ctx: CanvasRenderingContext2D) {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    const points = result.landmarks[0];
    if (!points) return;

    ctx.fillStyle = "#1fae5b";
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(31,174,91,0.8)";
    ctx.lineWidth = 3;
    for (const conn of PoseLandmarker.POSE_CONNECTIONS) {
      const pa = points[conn.start];
      const pb = points[conn.end];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * width, pa.y * height);
      ctx.lineTo(pb.x * width, pb.y * height);
      ctx.stroke();
    }
  }

  function loop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker) return;

    const now = performance.now();

    const result = landmarker.detectForVideo(video, now);

    const ctx = canvas.getContext("2d");

    if (ctx) {
      drawSkeleton(result, ctx);
    }

    const points = result.landmarks[0] as Landmark[] | undefined;

    if (points) {
      frameIndexRef.current += 1;

      if (frameIndexRef.current % LOG_SAMPLE_INTERVAL === 0) {
        logRef.current.push({
          t: Math.round(now - startTimeRef.current),
          landmarks: points,
        });
      }

      const event = counterRef.current.processFrame(points, now);

      if (event) {
        setReps(event.count);

        // VS mode → ส่งคะแนนเข้า match
        if (mode === "vs" && vsReadyRef.current) {
          updateVsScore(event.count);
        }
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  // 4) กันเริ่มก่อน VS พร้อม
  async function handleStart() {
    if (mode === "vs" && !vsReadyRef.current) {
      setErrorMsg("กำลังเตรียมการแข่งขัน กรุณารอสักครู่");
      return;
    }

    setErrorMsg("");
    setStatus("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await ensureLandmarker();

      counterRef.current.reset();
      logRef.current = [];
      frameIndexRef.current = 0;
      startTimeRef.current = performance.now();
      setReps(0);
      setStatus("running");
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setStatus("error");
      setErrorMsg("เปิดกล้องไม่ได้ — ตรวจสอบว่าอนุญาตสิทธิ์กล้องให้เว็บนี้แล้ว");
      stopStream();
    }
  }

  // 5) ใช้ supabase ตัวเดียว + กันส่งคะแนนหลังแมตช์จบ
  async function updateVsScore(count: number) {
    if (mode !== "vs" || !matchId || !vsRoleRef.current) {
      return;
    }

    const column =
      vsRoleRef.current === "challenger" ? "challenger_reps" : "opponent_reps";

    const { error } = await supabase
      .from("vs_matches")
      .update({
        [column]: count,
      })
      .eq("id", matchId)
      .eq("status", "active");

    if (error) {
      console.error("Failed to update VS score:", error);
    }
  }

  async function handleFinish() {
    stopStream();
    setStatus("saving");

    const durationSeconds = Math.round((performance.now() - startTimeRef.current) / 1000);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("pushup_sessions").insert({
        user_id: user.id,
        rep_count: counterRef.current.getCount(),
        duration_seconds: durationSeconds,
        landmark_log: logRef.current,
      });
    }

    setStatus("done");
  }

  // 8-9-10) โหลดข้อมูลแมตช์ + ผูก role เข้า Ref + ตั้ง status เป็น ready
  useEffect(() => {
    if (mode !== "vs" || !matchId) return;

    let cancelled = false;

    async function loadMatch() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setErrorMsg("กรุณาเข้าสู่ระบบก่อนแข่งขัน");
        }
        return;
      }

      const { data: match, error } = await supabase
        .from("vs_matches")
        .select(
          "id, challenger_id, opponent_id, challenger_reps, opponent_reps, status"
        )
        .eq("id", matchId)
        .single();

      if (error || !match) {
        if (!cancelled) {
          setErrorMsg("ไม่พบการแข่งขันนี้");
        }
        return;
      }

      if (match.challenger_id === user.id) {
        setVsRole("challenger");
        vsRoleRef.current = "challenger";
      } else if (match.opponent_id === user.id) {
        setVsRole("opponent");
        vsRoleRef.current = "opponent";
      } else {
        setErrorMsg("คุณไม่มีสิทธิ์เข้าร่วมการแข่งขันนี้");
        return;
      }

      if (!cancelled) {
        setVsReady(true);
        vsReadyRef.current = true;
        setStatus("ready");
      }
    }

    loadMatch();

    return () => {
      cancelled = true;
    };
  }, [mode, matchId, supabase]);

  // 6) รับคะแนนคู่แข่งแบบ Realtime
  useEffect(() => {
    if (mode !== "vs" || !matchId) return;

    const channel = supabase
      .channel(`vs-score-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vs_matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as VsMatch;

          if (vsRoleRef.current === "challenger") {
            setOpponentReps(updated.opponent_reps ?? 0);
          } else if (vsRoleRef.current === "opponent") {
            setOpponentReps(updated.challenger_reps ?? 0);
          }

          if (updated.status !== "active") {
            console.log("VS status changed:", updated.status);
          }
        }
      )
      .subscribe((status) => {
        console.log(`VS score realtime: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, matchId, supabase]);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      <div className="glass relative aspect-video w-full overflow-hidden rounded-[24px]">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="absolute inset-0 h-full w-full -scale-x-100"
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-ink/50">
            กดเริ่มนับเพื่อเปิดกล้อง
          </div>
        )}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-ink/50">
            กำลังเปิดกล้องและโหลดโมเดล...
          </div>
        )}
      </div>

      <RepRing value={reps} goal={GOAL} label="ครั้ง" size={180} />

      {/* 7) แสดงคะแนนคู่แข่งใต้ RepRing */}
      {mode === "vs" && (
        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-sm text-ink/50">คุณ</p>
            <p className="font-display text-3xl font-bold text-plum-deep">{reps}</p>
            <p className="text-xs text-ink/40">ครั้ง</p>
          </div>

          <div className="glass rounded-2xl p-4 text-center">
            <p className="text-sm text-ink/50">คู่แข่ง</p>
            <p className="font-display text-3xl font-bold text-plum-deep">
              {opponentReps}
            </p>
            <p className="text-xs text-ink/40">ครั้ง</p>
          </div>
        </div>
      )}

      {/* 11) แสดงบทบาท VS ก่อนปุ่มเริ่ม */}
      {mode === "vs" && (
        <div className="glass w-full max-w-md rounded-2xl p-4 text-center">
          <p className="text-sm text-ink/50">บทบาทของคุณ</p>
          <p className="mt-1 font-display text-xl font-bold text-plum-deep">
            {vsRole === "challenger"
              ? "⚔️ Challenger"
              : vsRole === "opponent"
                ? "⚔️ Opponent"
                : "กำลังตรวจสอบ..."}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-ink/40">คุณ</p>
              <p className="text-2xl font-bold">{reps}</p>
            </div>

            <div>
              <p className="text-xs text-ink/40">คู่แข่ง</p>
              <p className="text-2xl font-bold">{opponentReps}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* 12) ปิดปุ่มเริ่มถ้า VS ยังไม่พร้อม */}
        {status === "idle" || status === "error" ? (
          <GlassButton
            variant="primary"
            onClick={handleStart}
            disabled={mode === "vs" && !vsReady}
          >
            {mode === "vs" && !vsReady ? "กำลังเตรียมการแข่งขัน..." : "เริ่มนับ"}
          </GlassButton>
        ) : null}
        {status === "running" ? (
          <GlassButton variant="ghost" onClick={handleFinish}>
            จบเซสชัน & บันทึก
          </GlassButton>
        ) : null}
        {status === "saving" ? (
          <GlassButton variant="ghost" disabled>
            กำลังบันทึก...
          </GlassButton>
        ) : null}
        {status === "done" ? (
          <GlassButton variant="primary" onClick={handleStart}>
            เริ่มเซสชันใหม่
          </GlassButton>
        ) : null}
      </div>

      {status === "done" && (
        <p className="rounded-full bg-primary-tint px-4 py-1 text-sm font-medium text-primary-deep">
          บันทึกแล้ว — วิดพื้นไป {reps} ครั้ง
        </p>
      )}
      {errorMsg && (
        <p className="rounded-full bg-red-50 px-4 py-1 text-sm font-medium text-red-600">
          {errorMsg}
        </p>
      )}

      <p className="max-w-md text-center text-sm text-ink/50">
        ต้องขออนุญาตใช้กล้องก่อนเริ่ม — วิดีโอประมวลผลบนเครื่องคุณเท่านั้น
        มีการส่งเฉพาะจุดสัดส่วนร่างกาย (landmark) แบบสุ่มตัวอย่างขึ้นระบบเพื่อตรวจสอบผล
      </p>
    </div>
  );
}
