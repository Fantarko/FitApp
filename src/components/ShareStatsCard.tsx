"use client";

import { useState } from "react";
import GlassButton from "@/components/ui/GlassButton";

type ShareStatsCardProps = {
 displayName: string;
 monthReps: number;
 streak: number;
 activeDays: number;
 bestSingleSession: number;
};

export default function ShareStatsCard({
 displayName,
 monthReps,
 streak,
 activeDays,
 bestSingleSession,
}: ShareStatsCardProps) {
 const [generating, setGenerating] = useState(false);

 async function handleDownload() {
 setGenerating(true);
 try {
 const canvas = document.createElement("canvas");
 const W = 1080;
 const H = 1350; // portrait, IG-story/post friendly
 canvas.width = W;
 canvas.height = H;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 // background
 const bg = ctx.createLinearGradient(0, 0, 0, H);
 bg.addColorStop(0, "#f7faf4");
 bg.addColorStop(1, "#e4f5ea");
 ctx.fillStyle = bg;
 ctx.fillRect(0, 0, W, H);

 // brand
 ctx.fillStyle = "#0e6b39";
 ctx.font = "bold 56px sans-serif";
 ctx.fillText("FitGreen", 70, 130);

 ctx.fillStyle = "#14251b";
 ctx.font = "600 40px sans-serif";
 ctx.fillText(displayName || "นักวิดพื้น", 70, 200);

 // hero number
 ctx.fillStyle = "#1fae5b";
 ctx.font = "bold 220px sans-serif";
 ctx.fillText(`${monthReps}`, 70, 480);
 ctx.fillStyle = "#14251b";
 ctx.font = "500 44px sans-serif";
 ctx.fillText("ครั้ง เดือนนี้", 70, 540);

 // stat rows
 const stats: [string, string][] = [
 ["สตรีค", `${streak} วัน`],
 ["วันที่วิดเดือนนี้", `${activeDays} วัน`],
 ["ทำได้เยอะสุดใน 1 เซสชัน", `${bestSingleSession} ครั้ง`],
 ];

 let y = 680;
 for (const [label, value] of stats) {
 ctx.fillStyle = "rgba(255,255,255,0.7)";
 roundRect(ctx, 70, y - 55, W - 140, 100, 24);
 ctx.fill();

 ctx.fillStyle = "#14251b99";
 ctx.font = "500 32px sans-serif";
 ctx.fillText(label, 110, y - 5);

 ctx.fillStyle = "#0e6b39";
 ctx.font = "bold 40px sans-serif";
 const valueWidth = ctx.measureText(value).width;
 ctx.fillText(value, W - 110 - valueWidth, y - 5);

 y += 130;
 }

 ctx.fillStyle = "#14251b66";
 ctx.font = "500 28px sans-serif";
 ctx.fillText("fitgreen · วิดพื้นทุกวัน แข่งกับเพื่อน", 70, H - 60);

 const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
 if (!blob) return;

 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `fitgreen-stats-${new Date().toISOString().slice(0, 10)}.png`;
 a.click();
 URL.revokeObjectURL(url);
 } finally {
 setGenerating(false);
 }
 }

 return (
 <GlassButton variant="ghost" onClick={handleDownload} disabled={generating}>
 {generating ? "กำลังสร้างรูป..." : " แชร์สรุปผล"}
 </GlassButton>
 );
}

function roundRect(
 ctx: CanvasRenderingContext2D,
 x: number,
 y: number,
 w: number,
 h: number,
 r: number
) {
 ctx.beginPath();
 ctx.moveTo(x + r, y);
 ctx.arcTo(x + w, y, x + w, y + h, r);
 ctx.arcTo(x + w, y + h, x, y + h, r);
 ctx.arcTo(x, y + h, x, y, r);
 ctx.arcTo(x, y, x + w, y, r);
 ctx.closePath();
}
