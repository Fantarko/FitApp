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

const GOAL = 30;
// keep the server-side log light: one sample every N processed frames
const LOG_SAMPLE_INTERVAL = 15;

export default function PushupCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    if (ctx) drawSkeleton(result, ctx);

    const points = result.landmarks[0] as Landmark[] | undefined;
    if (points) {
      frameIndexRef.current += 1;
      if (frameIndexRef.current % LOG_SAMPLE_INTERVAL === 0) {
        logRef.current.push({ t: Math.round(now - startTimeRef.current), landmarks: points });
      }

      const event = counterRef.current.processFrame(points, now);
      if (event) setReps(event.count);
    }

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

  async function handleFinish() {
    stopStream();
    setStatus("saving");

    const durationSeconds = Math.round((performance.now() - startTimeRef.current) / 1000);
    const supabase = createClient();
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

      <div className="flex gap-4">
        {status === "idle" || status === "error" ? (
          <GlassButton variant="primary" onClick={handleStart}>
            เริ่มนับ
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
