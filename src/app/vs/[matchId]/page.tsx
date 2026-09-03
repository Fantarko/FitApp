"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import PushupCamera from "@/components/PushupCamera";
import BlobBackground from "@/components/BlobBackground";

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
 <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
 {/* Animated background */}
 <BlobBackground colors={["var(--color-plum)", "var(--color-sun)"]} /> <div className="glass animate-fade-in w-full max-w-md rounded-[28px] p-8 text-center"> <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-plum/10"> <span className="text-3xl animate-pulse"> </span> </div> <h1 className="font-display text-2xl font-bold text-plum-deep">
 กำลังเตรียมการแข่งขัน...
 </h1> <p className="mt-3 text-sm text-ink/60">
 กำลังโหลดข้อมูลการแข่งขัน
 </p> <div className="mx-auto mt-6 h-2 w-40 overflow-hidden rounded-full bg-black/10"> <div className="h-full w-1/2 animate-pulse rounded-full bg-plum-deep" /> </div> </div> </main>
 );
 }

 return (
 <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-8">
 {/* Animated background */}
 <BlobBackground colors={["var(--color-plum)", "var(--color-sun)"]} />

 {/* Header */}
 <div className="animate-fade-in mb-6 w-full max-w-2xl"> <button
 type="button"
 onClick={() => router.back()}
 className="
 mb-5
 text-sm
 text-ink/50
 transition-all
 duration-200
 hover:-translate-x-1
 hover:text-ink
 "
 >
 กลับ
 </button> <div className="text-center">
 {/* VS Badge */}
 <div className="animate-slide-up mb-4 flex justify-center"> <span
 className="
 inline-flex
 items-center
 gap-2
 rounded-full
 bg-plum/10
 px-4
 py-2
 text-xs
 font-bold
 tracking-[0.2em]
 text-plum-deep
 "
 > <span className="h-2 w-2 animate-pulse rounded-full bg-plum" />
 VS MATCH
 <span className="h-2 w-2 animate-pulse rounded-full bg-plum" /> </span> </div> <h1
 className="
 animate-slide-up
 font-display
 text-3xl
 font-bold
 text-plum-deep
 md:text-4xl
 "
 style={{ animationDelay: "100ms" }}
 >
 เตรียมตัวให้พร้อม
 </h1> <p
 className="
 animate-slide-up
 mx-auto
 mt-3
 max-w-md
 text-sm
 leading-6
 text-ink/60
 "
 style={{ animationDelay: "180ms" }}
 >
 เตรียมท่าวิดพื้นให้พร้อม
 <br />
 เมื่อเริ่มการแข่งขัน พยายามทำให้ได้มากที่สุด
 </p> </div> </div>

 {/* Match information */}
 <div
 className="
 glass
 animate-slide-up
 mb-5
 w-full
 max-w-2xl
 rounded-[24px]
 p-4
 "
 style={{ animationDelay: "250ms" }}
 > <div className="flex items-center justify-between"> <div> <p className="text-xs text-ink/40">
 MATCH ID
 </p> <p className="mt-1 max-w-[220px] truncate font-mono text-sm font-medium text-plum-deep">
 {matchId}
 </p> </div> <div
 className="
 flex
 items-center
 gap-2
 rounded-full
 bg-primary-tint
 px-3
 py-2
 transition-all
 duration-300
 hover:scale-105
 "
 > <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> <span className="text-xs font-medium text-primary-deep">
 พร้อมแข่งขัน
 </span> </div> </div> </div>

 {/* Camera */}
 <div
 className="animate-slide-up w-full max-w-2xl"
 style={{ animationDelay: "350ms" }}
 > <div className="relative">
 {/* Glow รอบกล้อง */}
 <div className="pointer-events-none absolute -inset-2 -z-10 rounded-[30px] bg-plum/10 blur-2xl" /> <PushupCamera
 mode="vs"
 matchId={matchId}
 /> </div> </div> </main>
 );
}