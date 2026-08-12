"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import Link from "next/link";
import GlassButton from "@/components/ui/GlassButton";
import { PushupCounter, type Landmark } from "@/lib/pose/pushupCounter";
import {
  TrackingQualityMonitor,
  CalibrationGate,
  sampleBrightness,
  QUALITY_MESSAGES_TH,
  type QualityIssue,
} from "@/lib/pose/frameQuality";
import { createClient } from "@/lib/supabase/client";

type Boss = {
  id: string;
  stage: number;
  name_th: string;
  hp: number;
  icon: string;
};

type Status =
  | "idle"
  | "loading"
  | "calibrating"
  | "countdown"
  | "fighting"
  | "saving"
  | "victory"
  | "error";

const LOG_SAMPLE_INTERVAL = 15;
const BRIGHTNESS_SAMPLE_INTERVAL = 5;

export default function BossBattleCamera({ boss }: { boss: Boss }) {
  const [supabase] = useState(() => createClient());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const counterRef = useRef(new PushupCounter());
  const qualityRef = useRef(new TrackingQualityMonitor());
  const calibrationRef = useRef(new CalibrationGate());
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const frameIndexRef = useRef(0);
  const lastBrightnessRef = useRef(255);
  const logRef = useRef<{ t: number; landmarks: Landmark[] }[]>([]);
  const statusRef = useRef<Status>("idle");
  const savedRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [reps, setReps] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([]);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [hitFlash, setHitFlash] = useState(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const hp = Math.max(0, boss.hp - reps);
  const hpPercent = Math.round((hp / boss.hp) * 100);

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
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

  function drawSkeleton(result: PoseLandmarkerResult, ctx: CanvasRenderingContext2D, ok: boolean) {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    const points = result.landmarks[0];
    if (!points) return;

    const color = ok ? "#1fae5b" : "#e0a30e";
    ctx.fillStyle = color;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = ok ? "rgba(31,174,91,0.8)" : "rgba(224,163,14,0.8)";
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

  function triggerHit() {
    setHitFlash(true);
    setTimeout(() => setHitFlash(false), 180);
  }

  function loop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const sampleCanvas = sampleCanvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !sampleCanvas || !landmarker) return;

    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);
    const points = result.landmarks[0] as Landmark[] | undefined;

    frameIndexRef.current += 1;
    if (frameIndexRef.current % BRIGHTNESS_SAMPLE_INTERVAL === 0) {
      lastBrightnessRef.current = sampleBrightness(video, sampleCanvas);
    }

    let qualityOk = true;

    if (points) {
      const quality = qualityRef.current.evaluate(points, lastBrightnessRef.current);
      qualityOk = quality.ok;

      setQualityIssues((prev) => {
        const same =
          prev.length === quality.issues.length &&
          prev.every((v, i) => v === quality.issues[i]);
        return same ? prev : quality.issues;
      });

      if (statusRef.current === "calibrating") {
        const passed = calibrationRef.current.update(qualityOk);
        setCalibrationProgress(calibrationRef.current.progress());
        if (passed) startCountdown();
      } else if (statusRef.current === "fighting") {
        if (frameIndexRef.current % LOG_SAMPLE_INTERVAL === 0) {
          logRef.current.push({ t: Math.round(now - startTimeRef.current), landmarks: points });
        }

        if (qualityOk) {
          const event = counterRef.current.processFrame(points, now);
          if (event) {
            setReps(event.count);
            triggerHit();
          }
        }
      }
    }

    const ctx = canvas.getContext("2d");
    if (ctx) drawSkeleton(result, ctx, qualityOk);

    rafRef.current = requestAnimationFrame(loop);
  }

  async function handleStart() {
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
      qualityRef.current.reset();
      calibrationRef.current.reset();
      logRef.current = [];
      frameIndexRef.current = 0;
      savedRef.current = false;
      setReps(0);
      setQualityIssues([]);
      setCalibrationProgress(0);
      setStatus("calibrating");
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setStatus("error");
      setErrorMsg("เปิดกล้องไม่ได้ — ตรวจสอบว่าอนุญาตสิทธิ์กล้องให้เว็บนี้แล้ว");
      stopStream();
    }
  }

  function startCountdown() {
    if (countdownTimerRef.current) return;
    setStatus("countdown");
    let n = 3;
    setCountdownNumber(n);
    countdownTimerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdownNumber(null);
        counterRef.current.reset();
        logRef.current = [];
        frameIndexRef.current = 0;
        startTimeRef.current = performance.now();
        setReps(0);
        setStatus("fighting");
      } else {
        setCountdownNumber(n);
      }
    }, 700);
  }

  function handleResetCalibration() {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    qualityRef.current.reset();
    calibrationRef.current.reset();
    setCalibrationProgress(0);
    setCountdownNumber(null);
    setStatus("calibrating");
  }

  // when hp hits 0, end the fight, save progress + a session record
  useEffect(() => {
    if (status !== "fighting" || hp > 0 || savedRef.current) return;
    savedRef.current = true;

    (async () => {
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
          low_quality_ratio: qualityRef.current.getLowQualityRatio(),
        });

        // keep the smallest (best) reps-to-defeat if this boss was beaten before
        const { data: existing } = await supabase
          .from("user_boss_progress")
          .select("best_reps_used")
          .eq("user_id", user.id)
          .eq("boss_id", boss.id)
          .maybeSingle();

        const bestReps =
          existing?.best_reps_used != null
            ? Math.min(existing.best_reps_used, counterRef.current.getCount())
            : counterRef.current.getCount();

        await supabase.from("user_boss_progress").upsert({
          user_id: user.id,
          boss_id: boss.id,
          defeated_at: new Date().toISOString(),
          best_reps_used: bestReps,
        });
      }

      setStatus("victory");
    })();
  }, [status, hp, boss.id, supabase, stopStream]);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      <canvas ref={sampleCanvasRef} width={32} height={18} className="hidden" />

      {/* boss */}
      <div className="w-full max-w-sm text-center">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-5xl transition-all duration-150 ${
            hitFlash ? "scale-90 bg-red-500/40" : "bg-black/5"
          }`}
        >
          {hp === 0 ? "💀" : boss.icon}
        </div>
        <p className="mt-2 font-display text-lg font-bold text-sun-deep">{boss.name_th}</p>
        <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-700 transition-all duration-200"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-ink/50">
          HP {hp} / {boss.hp}
        </p>
      </div>

      <div className="glass relative aspect-video w-full overflow-hidden rounded-[24px]">
        {/* Minecraft-style damage vignette */}
        {hitFlash && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle,transparent_40%,rgba(220,38,38,0.55)_100%)]" />
        )}

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
            กดเริ่มสู้เพื่อเปิดกล้อง
          </div>
        )}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-ink/50">
            กำลังเปิดกล้องและโหลดโมเดล...
          </div>
        )}

        {status === "calibrating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-6 text-center">
            <div className="text-4xl">📐</div>
            <p className="font-display text-lg font-semibold text-white">กำลังตั้งกล้อง</p>
            <p className="max-w-xs text-sm text-white/80">
              วางมือถือให้นิ่ง ให้เห็นทั้งตัวในเฟรม แสงพอ แล้วอยู่นิ่งสักครู่
            </p>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-sun transition-all duration-150"
                style={{ width: `${Math.round(calibrationProgress * 100)}%` }}
              />
            </div>
            {qualityIssues.length > 0 && (
              <div className="space-y-1">
                {qualityIssues.map((issue) => (
                  <p key={issue} className="text-xs font-medium text-amber-300">
                    ⚠️ {QUALITY_MESSAGES_TH[issue]}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {status === "countdown" && countdownNumber !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
            <div className="text-6xl">✋</div>
            <p className="font-display text-6xl font-bold text-white">{countdownNumber}</p>
            <p className="text-sm text-white/80">เตรียมตัว...</p>
          </div>
        )}

        {status === "fighting" && qualityIssues.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 space-y-1 bg-black/50 p-3">
            {qualityIssues.map((issue) => (
              <p key={issue} className="text-center text-xs font-medium text-amber-300">
                ⚠️ {QUALITY_MESSAGES_TH[issue]}
              </p>
            ))}
          </div>
        )}

        {(status === "calibrating" || status === "countdown" || status === "fighting") && (
          <button
            type="button"
            onClick={handleResetCalibration}
            className="absolute right-3 top-3 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
          >
            🔄 รีเซ็ตกล้อง
          </button>
        )}
      </div>

      <p className="font-display text-2xl font-bold text-primary-deep">{reps} ครั้ง</p>

      <div className="sticky bottom-4 z-10 flex gap-4 rounded-full bg-white/70 p-2 shadow-lg backdrop-blur">
        {status === "idle" || status === "error" ? (
          <GlassButton variant="primary" onClick={handleStart}>
            ⚔️ เริ่มสู้
          </GlassButton>
        ) : null}
        {status === "calibrating" || status === "countdown" ? (
          <GlassButton variant="ghost" disabled>
            {status === "calibrating" ? "กำลังตั้งกล้อง..." : "เตรียมตัว..."}
          </GlassButton>
        ) : null}
        {status === "fighting" ? (
          <GlassButton variant="ghost" disabled>
            กำลังต่อสู้...
          </GlassButton>
        ) : null}
        {status === "saving" ? (
          <GlassButton variant="ghost" disabled>
            กำลังบันทึก...
          </GlassButton>
        ) : null}
        {status === "victory" ? (
          <div className="flex gap-3">
            <Link href="/boss">
              <GlassButton variant="sun">กลับไปเลือกด่าน</GlassButton>
            </Link>
          </div>
        ) : null}
      </div>

      {status === "victory" && (
        <p className="rounded-full bg-primary-tint px-4 py-1 text-sm font-medium text-primary-deep">
          🎉 ปราบ {boss.name_th} สำเร็จ! ใช้ไป {reps} ครั้ง
        </p>
      )}
      {errorMsg && (
        <p className="rounded-full bg-red-50 px-4 py-1 text-sm font-medium text-red-600">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
