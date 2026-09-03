"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
 FilesetResolver,
 PoseLandmarker,
 type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import GlassButton from "@/components/ui/GlassButton";
import RepRing from "@/components/ui/RepRing";
import PopNumber from "@/components/animation/PopNumber";
import Confetti from "@/components/animation/Confetti";
import ScaleIn from "@/components/animation/ScaleIn";
import MotivationToast from "@/components/animation/MotivationToast";
import { playRepSound, playMilestoneSound } from "@/lib/sound";
import { MOTIVATION_MESSAGES_TH } from "@/lib/motivation";
import { getTodayChallenge } from "@/lib/dailyChallenge";
import { PushupCounter, type Landmark } from "@/lib/pose/pushupCounter";
import {
 TrackingQualityMonitor,
 CalibrationGate,
 sampleBrightness,
 QUALITY_MESSAGES_TH,
 type QualityIssue,
} from "@/lib/pose/frameQuality";
import { createClient } from "@/lib/supabase/client";
import { analyzePushupForm } from "@/lib/pose/formAnalysis";

type Status =
 | "idle"
 | "loading"
 | "calibrating"
 | "waiting_opponent"
 | "countdown"
 | "running"
 | "saving"
 | "done"
 | "error";

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
 duration_seconds: number;
 winner_id: string | null;
 started_at: string | null;
};

const GOAL = 30;

function formatDuration(totalSeconds: number): string {
 const m = Math.floor(totalSeconds / 60);
 const s = totalSeconds % 60;
 return `${m}:${s.toString().padStart(2, "0")}`;
}
// keep the server-side log light: one sample every N processed frames
const LOG_SAMPLE_INTERVAL = 15;
const BRIGHTNESS_SAMPLE_INTERVAL = 5;

export default function PushupCamera({
 mode = "solo",
 matchId,
}: PushupCameraProps) {
 // 3) Supabase client ตัวเดียวต่อ component
 const [supabase] = useState(() => createClient());

 const videoRef = useRef<HTMLVideoElement | null>(null);
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
 const landmarkerRef = useRef<PoseLandmarker | null>(null);
 const counterRef = useRef(new PushupCounter());
 const qualityRef = useRef(new TrackingQualityMonitor());
 const calibrationRef = useRef(new CalibrationGate());
 const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const rafRef = useRef<number | null>(null);
 const streamRef = useRef<MediaStream | null>(null);
 const startTimeRef = useRef<number>(0);
 const frameIndexRef = useRef(0);
 const lastBrightnessRef = useRef(255);
 const logRef = useRef<{ t: number; landmarks: Landmark[] }[]>([]);

 const [status, setStatus] = useState<Status>("idle");
 const [reps, setReps] = useState(0);
 const [errorMsg, setErrorMsg] = useState("");
 const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([]);
 const [calibrationProgress, setCalibrationProgress] = useState(0);
 const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
 const [motivationMessage, setMotivationMessage] = useState<string | null>(null);
 const [motivationVariant, setMotivationVariant] = useState(0);
 const [lastDurationSeconds, setLastDurationSeconds] = useState(0);
 const [challengeCleared, setChallengeCleared] = useState(false);
 const [formScore, setFormScore] = useState(80);
 const [coachMessage, setCoachMessage] = useState("เตรียมท่าให้พร้อม");
 const [workoutScore, setWorkoutScore] = useState(0);
 const motivationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 const [vsRole, setVsRole] = useState<"challenger" | "opponent" | null>(null);
 const [vsReady, setVsReady] = useState(false);
 // 6) คะแนนของคู่แข่ง (รับผ่าน Realtime)
 const [opponentReps, setOpponentReps] = useState(0);
 const [opponentName, setOpponentName] = useState<string | null>(null);
 const [matchDuration, setMatchDuration] = useState(60);
 const [timeLeft, setTimeLeft] = useState<number | null>(null);
 const [vsResult, setVsResult] = useState<"win" | "lose" | "tie" | null>(null);
 const [reportOpen, setReportOpen] = useState(false);
 const [reportReason, setReportReason] = useState("");
 const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
 const matchStartedAtRef = useRef<number | null>(null);

 const vsRoleRef = useRef<"challenger" | "opponent" | null>(null);
 const vsReadyRef = useRef(false);
 const vsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const vsFinishedRef = useRef(false);
 const statusRef = useRef<Status>("idle");
 useEffect(() => {
 statusRef.current = status;
 }, [status]);

 const stopStream = useCallback(() => {
 if (rafRef.current) cancelAnimationFrame(rafRef.current);
 if (countdownTimerRef.current) {
 clearInterval(countdownTimerRef.current);
 countdownTimerRef.current = null;
 }
 if (vsTimerRef.current) {
 clearInterval(vsTimerRef.current);
 vsTimerRef.current = null;
 }
 if (motivationTimerRef.current) {
 clearTimeout(motivationTimerRef.current);
 motivationTimerRef.current = null;
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
 "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
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
 if (statusRef.current === "running" || statusRef.current === "calibrating") {
 const analysis = analyzePushupForm(points, formScore);
 setFormScore((prev) => Math.round(prev * 0.8 + analysis.score * 0.2));
 setCoachMessage(analysis.coach);
 }

 setQualityIssues((prev) => {
 const same =
 prev.length === quality.issues.length &&
 prev.every((v, i) => v === quality.issues[i]);
 return same ? prev : quality.issues;
 });

 if (statusRef.current === "calibrating") {
 // require N consecutive good frames before we trust this camera setup —
 // this is the actual fix for "ขยับกล้องแล้วนับมั่ว": we never start counting
 // against a stale/just-moved baseline, we force a fresh stable read first.
 const passed = calibrationRef.current.update(qualityOk);
 setCalibrationProgress(calibrationRef.current.progress());
 if (passed) {
 if (mode === "vs") {
 markReadyForVs();
 } else {
 startCountdown();
 }
 }
 } else if (statusRef.current === "running") {
 if (frameIndexRef.current % LOG_SAMPLE_INTERVAL === 0) {
 logRef.current.push({
 t: Math.round(now - startTimeRef.current),
 landmarks: points,
 });
 }

 // gate counting on quality: bad light / camera shake / unclear tracking
 // never reach the counter, closing the easiest cheat vector
 if (qualityOk) {
 const event = counterRef.current.processFrame(points, now);

 if (event) {
 setReps(event.count);

 if (event.count % 10 === 0) {
 playMilestoneSound();
 const idx = (event.count / 10 - 1) % MOTIVATION_MESSAGES_TH.length;
 setMotivationMessage(MOTIVATION_MESSAGES_TH[idx]);
 setMotivationVariant(idx);
 if (motivationTimerRef.current) clearTimeout(motivationTimerRef.current);
 motivationTimerRef.current = setTimeout(() => setMotivationMessage(null), 2200);
 } else {
 playRepSound();
 }

 // VS mode ส่งคะแนนเข้า match
 if (mode === "vs" && vsReadyRef.current) {
 updateVsScore(event.count);
 }
 }
 }
 }
 }

 const ctx = canvas.getContext("2d");
 if (ctx) {
 drawSkeleton(result, ctx, qualityOk);
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
 qualityRef.current.reset();
 calibrationRef.current.reset();
 logRef.current = [];
 frameIndexRef.current = 0;
 setReps(0);
 setQualityIssues([]);
 setCalibrationProgress(0);
 setVsResult(null);
 setReportOpen(false);
 setReportReason("");
 setReportStatus("idle");
 setChallengeCleared(false);
 setStatus("calibrating");
 rafRef.current = requestAnimationFrame(loop);
 } catch {
 setStatus("error");
 setErrorMsg("เปิดกล้องไม่ได้ — ตรวจสอบว่าอนุญาตสิทธิ์กล้องให้เว็บนี้แล้ว");
 stopStream();
 }
 }

 /** VS mode: signal this player's camera is calibrated and ready — the shared
 * countdown only starts once BOTH players have called this (see mark_player_ready). */
 async function markReadyForVs() {
 if (!matchId) return;
 setStatus("waiting_opponent");

 const { data, error } = await supabase.rpc("mark_player_ready", { p_match_id: matchId });
 if (error || !data) return;

 const result = data as VsMatch;
 if (result.started_at) {
 // the other player was already waiting — this call was the one that
 // completed the pair, so start immediately instead of waiting on realtime
 matchStartedAtRef.current = new Date(result.started_at).getTime();
 if (statusRef.current === "waiting_opponent") startCountdown();
 }
 }

 function startCountdown() {
 if (countdownTimerRef.current) return; // already counting down
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
 qualityRef.current.startDepthTracking();
 setReps(0);
 setStatus("running");

 if (mode === "vs") {
 const startedAtMs = matchStartedAtRef.current ?? Date.now();
 const tick = () => {
 const remaining = matchDuration - Math.floor((Date.now() - startedAtMs) / 1000);
 setTimeLeft(Math.max(0, remaining));
 if (remaining <= 0) {
 finishVsMatch();
 }
 };
 tick();
 vsTimerRef.current = setInterval(tick, 500);
 }
 } else {
 setCountdownNumber(n);
 }
 }, 700);
 }

 /** Manual re-calibration — for when the person moves the camera mid-session. */
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

 // 5) ใช้ supabase ตัวเดียว + กันส่งคะแนนหลังแมตช์จบ
 async function updateVsScore(count: number) {
 if (mode !== "vs" || !matchId || !vsRoleRef.current) return;
 const { error } = await supabase.rpc("update_vs_score", {
 p_match_id: matchId,
 p_reps: count,
 });
 if (error) console.error("Failed to update VS score:", error);
 }

 async function handleFinish() {
 stopStream();
 setStatus("saving");

 const durationSeconds = Math.round((performance.now() - startTimeRef.current) / 1000);
 setLastDurationSeconds(durationSeconds);
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (user) {
 const { data: completion, error: completionError } = await supabase.rpc(
 "complete_pushup_session",
 {
 p_user_id: user.id,
 p_reps: counterRef.current.getCount(),
 p_duration_seconds: durationSeconds,
 p_landmark_log: logRef.current,
 p_low_quality_ratio: qualityRef.current.getLowQualityRatio(),
 p_match_id: mode === "vs" ? matchId ?? null : null,
 }
 );

 if (completionError || !completion) {
 console.error("Failed to complete push-up session:", completionError);
 setErrorMsg(completionError?.message ?? "บันทึกผลวิดพื้นไม่สำเร็จ");
 setStatus("error");
 return;
 }

 const session = { id: (completion as { session_id?: string }).session_id ?? null };

 // daily challenge: same rule for everyone today (see lib/dailyChallenge.ts) —
 // if this session cleared it, record completion (upsert is safe against double-finish clicks)
 if (mode === "solo") {
 const challenge = getTodayChallenge();
 const cleared =
 counterRef.current.getCount() >= challenge.targetReps &&
 (challenge.targetSeconds === null || durationSeconds <= challenge.targetSeconds);
 if (cleared) {
 setChallengeCleared(true);
 await supabase.from("daily_challenge_progress").upsert({
 user_id: user.id,
 challenge_date: challenge.id,
 session_id: session?.id ?? null,
 });
 }
 }
 }

 const speedScore = durationSeconds > 0
 ? Math.max(0, Math.min(100, Math.round((counterRef.current.getCount() / durationSeconds) * 20)))
 : 0;
 setWorkoutScore(Math.round(formScore * 0.55 + speedScore * 0.15 + Math.min(100, counterRef.current.getCount() * 2) * 0.30));
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
 "id, challenger_id, opponent_id, challenger_reps, opponent_reps, status, duration_seconds, started_at"
 )
 .eq("id", matchId)
 .single();

 if (error || !match) {
 if (!cancelled) {
 setErrorMsg("ไม่พบการแข่งขันนี้");
 }
 return;
 }

 let opponentId: string | null = null;

 if (match.challenger_id === user.id) {
 setVsRole("challenger");
 vsRoleRef.current = "challenger";
 opponentId = match.opponent_id;
 } else if (match.opponent_id === user.id) {
 setVsRole("opponent");
 vsRoleRef.current = "opponent";
 opponentId = match.challenger_id;
 } else {
 setErrorMsg("คุณไม่มีสิทธิ์เข้าร่วมการแข่งขันนี้");
 return;
 }

 if (opponentId) {
 const { data: opponentProfile } = await supabase
 .from("profiles")
 .select("display_name")
 .eq("id", opponentId)
 .single();
 if (!cancelled) {
 setOpponentName(opponentProfile?.display_name ?? "คู่แข่ง");
 }
 }

 if (!cancelled) {
 setMatchDuration(match.duration_seconds ?? 60);
 // null until both players are ready (see mark_player_ready) — do NOT
 // default to Date.now() here, that would fake an already-started match
 matchStartedAtRef.current = match.started_at ? new Date(match.started_at).getTime() : null;
 setOpponentReps(
 vsRoleRef.current === "challenger" ? match.opponent_reps ?? 0 : match.challenger_reps ?? 0
 );
 setVsReady(true);
 vsReadyRef.current = true;
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

 // the other player just became ready too — this is the synchronized
 // "go" signal for whichever side is still sitting in waiting_opponent
 if (
 updated.started_at &&
 !matchStartedAtRef.current &&
 statusRef.current === "waiting_opponent"
 ) {
 matchStartedAtRef.current = new Date(updated.started_at).getTime();
 startCountdown();
 }

 if (updated.status === "completed" && !vsFinishedRef.current) {
 vsFinishedRef.current = true;
 if (vsTimerRef.current) {
 clearInterval(vsTimerRef.current);
 vsTimerRef.current = null;
 }
 const myId = vsRoleRef.current === "challenger" ? updated.challenger_id : updated.opponent_id;
 setVsResult(
 !updated.winner_id ? "tie" : updated.winner_id === myId ? "win" : "lose"
 );
 stopStream();
 setStatus("done");
 }
 }
 )
 .subscribe();

 return () => {
 supabase.removeChannel(channel);
 };
 }, [mode, matchId, supabase, stopStream]);

 async function finishVsMatch() {
 if (!matchId || vsFinishedRef.current) return;
 vsFinishedRef.current = true;
 if (vsTimerRef.current) {
 clearInterval(vsTimerRef.current);
 vsTimerRef.current = null;
 }

 const durationSeconds = Math.round((performance.now() - startTimeRef.current) / 1000);
 setLastDurationSeconds(durationSeconds);
 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) {
 setErrorMsg("กรุณาเข้าสู่ระบบก่อนบันทึกผลการแข่งขัน");
 setStatus("error");
 return;
 }

 // Keep a session row for history/stats charts. Player progress is updated
 // by complete_vs_match() below, so this insert must not touch player_stats.
 const { error: sessionError } = await supabase.rpc("save_pushup_session", {
 p_rep_count: counterRef.current.getCount(),
 p_duration_seconds: durationSeconds,
 p_landmark_log: logRef.current,
 p_low_quality_ratio: qualityRef.current.getLowQualityRatio(),
 p_match_id: matchId,
 });

 if (sessionError) {
 console.error("Failed to save VS session:", sessionError);
 setErrorMsg(sessionError.message);
 setStatus("error");
 return;
 }

 // Read the authoritative server score before completing. This avoids a
 // React-state race where the last realtime update has not reached the UI yet.
 const { data: authoritativeMatch, error: scoreReadError } = await supabase
 .from("vs_matches")
 .select("challenger_reps, opponent_reps")
 .eq("id", matchId)
 .single();

 if (scoreReadError || !authoritativeMatch) {
 console.error("Failed to read authoritative VS score:", scoreReadError);
 setErrorMsg(scoreReadError?.message ?? "อ่านคะแนนการแข่งขันไม่สำเร็จ");
 setStatus("error");
 return;
 }

 // complete_vs_match() is the single server transaction that finalizes the
 // match and updates XP, rating, win/loss/draw, streak and total reps.
 const { data, error } = await supabase.rpc("complete_vs_match", {
 p_match_id: matchId,
 p_challenger_reps: authoritativeMatch.challenger_reps ?? 0,
 p_opponent_reps: authoritativeMatch.opponent_reps ?? 0,
 });

 if (error) {
 console.error("Failed to complete VS match:", error);
 // Another player may have completed it milliseconds earlier. Re-read the
 // match so the UI still shows the authoritative server result.
 const { data: currentMatch } = await supabase
 .from("vs_matches")
 .select("challenger_id, opponent_id, challenger_reps, opponent_reps, winner_id, status")
 .eq("id", matchId)
 .single();

 if (currentMatch?.status === "completed") {
 const myId = vsRoleRef.current === "challenger" ? currentMatch.challenger_id : currentMatch.opponent_id;
 setVsResult(!currentMatch.winner_id ? "tie" : currentMatch.winner_id === myId ? "win" : "lose");
 } else {
 setErrorMsg(error.message);
 setStatus("error");
 return;
 }
 } else if (data) {
 const result = data as { winner_id: string | null };
 const myId = vsRoleRef.current === "challenger" ? user.id : user.id;
 setVsResult(!result.winner_id ? "tie" : result.winner_id === myId ? "win" : "lose");
 }
 stopStream();
 setStatus("done");
 }

 async function submitCheatReport() {
 if (!matchId || !reportReason.trim()) return;
 setReportStatus("sending");

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 setReportStatus("error");
 return;
 }

 const { error } = await supabase.from("cheat_reports").insert({
 match_id: matchId,
 reported_by: user.id,
 reason: reportReason.trim(),
 });

 setReportStatus(error ? "error" : "sent");
 }

 return (
 <div className="flex w-full max-w-2xl flex-col items-center gap-6"> <canvas ref={sampleCanvasRef} width={32} height={18} className="hidden" /> <div className="glass relative aspect-video w-full overflow-hidden rounded-[24px]"> <MotivationToast message={motivationMessage} variantIndex={motivationVariant} />

 {/* VS: tug-of-war bar + timer, overlaid directly on the camera so it's
 visible while looking at yourself — no more glancing away */}
 {mode === "vs" && (status === "running" || status === "countdown" || status === "calibrating") && (
 <div className="absolute inset-x-0 top-0 z-10 px-3 pt-3">
 {timeLeft !== null && (
 <p className="text-center font-display text-2xl font-bold text-white drop-shadow">
 {timeLeft} วิ
 </p>
 )}
 <div className="mt-2 flex items-center gap-2"> <span className="w-8 shrink-0 text-right font-display text-sm font-bold text-white drop-shadow">
 {reps}
 </span> <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-black/40"> <div
 className="absolute inset-y-0 left-0 bg-gradient-to-r from-plum to-plum-deep transition-all duration-300"
 style={{
 width: `${
 reps + opponentReps === 0
 ? 50
 : Math.round((reps / (reps + opponentReps)) * 100)
 }%`,
 }}
 />
 {/* center marker — the tug-of-war "rope midpoint" */}
 <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/60" /> </div> <span className="w-8 shrink-0 font-display text-sm font-bold text-white drop-shadow">
 {opponentReps}
 </span> </div> <p className="mt-1 text-center text-xs text-white/80 drop-shadow">
 VS {opponentName ?? "คู่แข่ง"}
 </p> </div>
 )}
 <video
 ref={videoRef}
 className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
 playsInline
 muted
 /> <canvas
 ref={canvasRef}
 width={640}
 height={360}
 className="absolute inset-0 h-full w-full -scale-x-100"
 />
 {status === "idle" && (
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
 <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/30">
 <div className="h-7 w-7 rounded-full bg-primary/25" />
 </div>
 <div>
 <p className="font-display text-base font-semibold text-ink/70">พร้อมเริ่มวิดพื้นหรือยัง</p>
 <p className="mt-1 text-sm text-ink/45">กดปุ่มด้านล่างเพื่อเปิดกล้องแล้วเริ่มนับ</p>
 </div>
 </div>
 )}
 {status === "loading" && (
 <div className="absolute inset-0 flex items-center justify-center text-ink/50">
 กำลังเปิดกล้องและโหลดโมเดล...
 </div>
 )}

 {status === "calibrating" && (
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-6 text-center"> <div className="h-3 w-3 rounded-full bg-white/70" /> <p className="font-display text-lg font-semibold text-white">
 กำลังตั้งกล้อง
 </p> <p className="max-w-xs text-sm text-white/80">
 วางมือถือให้นิ่ง (พิงหรือใช้ขาตั้ง) ให้เห็นทั้งตัวในเฟรม แสงพอ
 แล้วอยู่นิ่งสักครู่
 </p> <div className="h-2 w-48 overflow-hidden rounded-full bg-white/20"> <div
 className="h-full rounded-full bg-primary transition-all duration-150"
 style={{ width: `${Math.round(calibrationProgress * 100)}%` }}
 /> </div>
 {qualityIssues.length > 0 && (
 <div className="space-y-1">
 {qualityIssues.map((issue) => (
 <p key={issue} className="text-xs font-medium text-amber-300">
 {QUALITY_MESSAGES_TH[issue]}
 </p>
 ))}
 </div>
 )}
 </div>
 )}

 {status === "waiting_opponent" && (
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-6 text-center"> <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-plum" /> <p className="font-display text-lg font-semibold text-white">
 พร้อมแล้ว! รอ {opponentName ?? "คู่แข่ง"}...
 </p> <p className="max-w-xs text-sm text-white/80">
 เริ่มนับพร้อมกันทันทีที่อีกฝั่งตั้งกล้องเสร็จ
 </p> </div>
 )}

 {status === "countdown" && countdownNumber !== null && (
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40"> <p className="font-display text-6xl font-bold text-white">
 {countdownNumber}
 </p> <p className="text-sm text-white/80">เตรียมตัว...</p> </div>
 )}

 {status === "running" && qualityIssues.length > 0 && (
 <div className="absolute inset-x-0 bottom-0 space-y-1 bg-black/50 p-3">
 {qualityIssues.map((issue) => (
 <p key={issue} className="text-center text-xs font-medium text-amber-300">
 {QUALITY_MESSAGES_TH[issue]}
 </p>
 ))}
 <p className="text-center text-[11px] text-white/60">
 หยุดนับชั่วคราวจนกว่าจะแก้ปัญหาข้างต้น
 </p> </div>
 )}

 {(status === "calibrating" ||
 status === "waiting_opponent" ||
 status === "countdown" ||
 status === "running") && (
 <button
 type="button"
 onClick={handleResetCalibration}
 className="absolute right-3 top-3 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
 >
 รีเซ็ตกล้อง
 </button>
 )}
 </div>

 {(status === "running" || status === "saving" || status === "done") && (
 <div className="flex w-full max-w-sm items-center gap-4 rounded-2xl bg-white/45 px-4 py-3 backdrop-blur">
 <div className="text-center">
 <p
 className={`font-display text-2xl font-bold ${
 formScore >= 80 ? "text-primary-deep" : formScore >= 60 ? "text-sun-deep" : "text-red-600"
 }`}
 >
 {formScore}
 </p>
 <p className="text-[10px] uppercase tracking-wide text-ink/40">ฟอร์ม</p>
 </div>
 <div className="h-9 w-px shrink-0 bg-black/10" />
 <p className="text-xs font-medium leading-snug text-ink/65">{coachMessage}</p>
 </div>
 )}

 <RepRing value={reps} goal={GOAL} label="ครั้ง" size={180} />

 <div className="sticky bottom-4 z-10 flex gap-4 rounded-full bg-white/70 p-2 shadow-lg backdrop-blur">
 {status === "idle" || status === "error" ? (
 <GlassButton
 variant="primary"
 onClick={handleStart}
 disabled={mode === "vs" && !vsReady}
 className="px-8 py-4 text-lg"
 >
 {mode === "vs" && !vsReady ? "กำลังเตรียมการแข่งขัน..." : "เริ่มนับ"}
 </GlassButton>
 ) : null}
 {status === "calibrating" || status === "waiting_opponent" || status === "countdown" ? (
 <GlassButton variant="ghost" disabled>
 {status === "calibrating"
 ? "กำลังตั้งกล้อง..."
 : status === "waiting_opponent"
 ? "รอคู่แข่ง..."
 : "เตรียมตัว..."}
 </GlassButton>
 ) : null}
 {status === "running" && mode === "solo" ? (
 <GlassButton variant="ghost" onClick={handleFinish}>
 จบเซสชัน & บันทึก
 </GlassButton>
 ) : null}
 {status === "running" && mode === "vs" ? (
 <GlassButton variant="ghost" disabled>
 กำลังแข่งขัน...
 </GlassButton>
 ) : null}
 {status === "saving" ? (
 <GlassButton variant="ghost" disabled>
 กำลังบันทึก...
 </GlassButton>
 ) : null}
 {status === "done" ? (
 <GlassButton variant="primary" onClick={handleStart} className="px-8 py-4 text-lg">
 เริ่มเซสชันใหม่
 </GlassButton>
 ) : null}
 </div>

 {status === "done" && mode === "vs" && vsResult && (
 <> <Confetti trigger={vsResult === "win"} /> <ScaleIn className="glass w-full max-w-sm rounded-[24px] p-6 text-center"> <p
 className={`inline-block rounded-full px-4 py-1 text-sm font-medium ${
 vsResult === "win"
 ? "bg-primary-tint text-primary-deep"
 : vsResult === "lose"
 ? "bg-red-50 text-red-600"
 : "bg-sun/20 text-sun-deep"
 }`}
 >
 {vsResult === "win" ? "คุณชนะ!" : vsResult === "lose" ? "คุณแพ้" : "เสมอ"}
 </p> <div className="mt-4 grid grid-cols-2 gap-3"> <div> <p className="text-xs text-ink/40">คุณ</p> <p className="font-display text-3xl font-bold text-plum-deep">{reps}</p> </div> <div> <p className="text-xs text-ink/40">{opponentName ?? "คู่แข่ง"}</p> <p className="font-display text-3xl font-bold text-ink/60">{opponentReps}</p> </div> </div> <p className="mt-4 text-sm text-ink/50">
 ใช้เวลาทั้งหมด {formatDuration(lastDurationSeconds)}
 </p> </ScaleIn>

 {reportStatus === "sent" ? (
 <p className="text-xs text-ink/50">ส่งรายงานแล้ว ทีมงานจะตรวจสอบ</p>
 ) : reportOpen ? (
 <div className="glass w-full max-w-sm rounded-2xl p-4"> <p className="text-sm font-medium text-ink/70">รายงานคู่แข่ง</p> <textarea
 value={reportReason}
 onChange={(e) => setReportReason(e.target.value)}
 placeholder="อธิบายสั้นๆ ว่าสงสัยอะไร เช่น จำนวนครั้งเพิ่มเร็วผิดปกติ"
 className="mt-2 w-full rounded-xl border border-black/10 bg-white/60 p-2 text-sm"
 rows={2}
 /> <div className="mt-2 flex gap-2"> <GlassButton
 variant="ghost"
 className="flex-1 text-sm"
 onClick={submitCheatReport}
 disabled={!reportReason.trim() || reportStatus === "sending"}
 >
 {reportStatus === "sending" ? "กำลังส่ง..." : "ส่งรายงาน"}
 </GlassButton> <GlassButton variant="ghost" className="text-sm" onClick={() => setReportOpen(false)}>
 ยกเลิก
 </GlassButton> </div>
 {reportStatus === "error" && (
 <p className="mt-1 text-xs text-red-600">ส่งไม่สำเร็จ ลองอีกครั้ง</p>
 )}
 </div>
 ) : (
 <button
 type="button"
 onClick={() => setReportOpen(true)}
 className="text-xs text-ink/40 underline underline-offset-4"
 >
 รายงานคู่แข่ง
 </button>
 )}
 </>
 )}
 {status === "done" && mode === "solo" && (
 <> <Confetti trigger={reps > 0} /> <ScaleIn className="glass w-full max-w-sm rounded-[24px] p-6 text-center"> <p className="inline-block rounded-full bg-primary-tint px-4 py-1 text-sm font-medium text-primary-deep">
 บันทึกเซสชันแล้ว
 </p> <div className="mt-4 grid grid-cols-2 gap-4"> <div> <p className="text-xs text-ink/40">จำนวนครั้ง</p> <PopNumber
 value={reps}
 prefix=""
 className="font-display text-4xl font-bold text-primary-deep"
 /> </div> <div> <p className="text-xs text-ink/40">เวลาที่ใช้</p> <p className="font-display text-4xl font-bold text-ink/70">
 {formatDuration(lastDurationSeconds)}
 </p> </div> </div> <div className="mt-4 rounded-2xl bg-primary-tint p-3"> <p className="text-xs text-ink/45">คะแนนการออกกำลังกาย</p> <p className="font-display text-3xl font-bold text-primary-deep">{workoutScore}/100</p> <p className="mt-1 text-xs text-ink/50">ฟอร์ม {formScore}/100 · ความเร็ว + ความสม่ำเสมอ จาก session นี้</p> </div>
 {challengeCleared && (
 <p className="mt-4 inline-block rounded-full bg-sun/20 px-3 py-1 text-xs font-semibold text-sun-deep">
 ผ่านท้าประจำวันแล้ว! +50 XP
 </p>
 )}
 </ScaleIn> </>
 )}
 {errorMsg && (
 <p className="rounded-full bg-red-50 px-4 py-1 text-sm font-medium text-red-600">
 {errorMsg}
 </p>
 )}

 <p className="max-w-md text-center text-sm text-ink/50">
 ต้องขออนุญาตใช้กล้องก่อนเริ่ม — วิดีโอประมวลผลบนเครื่องคุณเท่านั้น
 มีการส่งเฉพาะจุดสัดส่วนร่างกาย (landmark) แบบสุ่มตัวอย่างขึ้นระบบเพื่อตรวจสอบผล
 </p> </div>
 );
}
