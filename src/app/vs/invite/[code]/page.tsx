"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FadeIn from "@/components/animation/FadeIn";

type JoinResult = {
  id: string;
  status: "pending" | "active" | "completed" | "cancelled" | "disputed";
  challenger_id: string;
};

export default function InviteJoinPage() {
  const params = useParams();
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [state, setState] = useState<"joining" | "waiting" | "error">("joining");
  const [errorMsg, setErrorMsg] = useState("");
  const matchIdRef = useRef<string | null>(null);

  const code = typeof params.code === "string" ? params.code : null;

  useEffect(() => {
    if (!code) {
      setState("error");
      setErrorMsg("ลิงก์ไม่ถูกต้อง");
      return;
    }

    let cancelled = false;

    async function join() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?next=/vs/invite/${code}`);
        return;
      }

      const { data, error } = await supabase.rpc("join_match_by_invite", { p_code: code });

      if (cancelled) return;

      if (error || !data) {
        setState("error");
        setErrorMsg(error?.message === "Invite not found or already in use"
          ? "ลิงก์นี้ใช้ไม่ได้แล้ว หรือหมดอายุ"
          : "เข้าร่วมแมตช์ไม่สำเร็จ ลองใหม่อีกครั้ง");
        return;
      }

      const result = data as JoinResult;
      matchIdRef.current = result.id;

      if (result.status === "active") {
        router.push(`/vs/${result.id}`);
      } else if (result.status === "pending" && result.challenger_id === user.id) {
        // เจ้าของลิงก์เปิดลิงก์ตัวเอง — พาไปหน้ารอที่ /vs ตามปกติ
        router.push("/vs");
      } else {
        // แมตช์ยังไม่ active ด้วยเหตุผลอื่น (เช่น เพิ่งโดนแย่งไปพอดี)
        setState("waiting");
      }
    }

    join();

    return () => {
      cancelled = true;
    };
  }, [code, supabase, router]);

  // เผื่อกรณี race condition — ฟังการเปลี่ยนสถานะแล้วค่อยพาไปต่อ
  useEffect(() => {
    if (state !== "waiting" || !matchIdRef.current) return;

    const channel = supabase
      .channel(`invite-wait-${matchIdRef.current}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vs_matches",
          filter: `id=eq.${matchIdRef.current}`,
        },
        (payload) => {
          const updated = payload.new as { status: string };
          if (updated.status === "active" && matchIdRef.current) {
            router.push(`/vs/${matchIdRef.current}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state, supabase, router]);

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-plum/20 blur-3xl" />
      </div>

      <FadeIn className="glass w-full max-w-sm rounded-[24px] p-8 text-center">
        {state === "joining" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-plum/30 border-t-plum-deep" />
            <p className="font-display text-lg font-bold text-plum-deep">กำลังเข้าร่วมแมตช์...</p>
          </>
        )}
        {state === "waiting" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-plum/30 border-t-plum-deep" />
            <p className="font-display text-lg font-bold text-plum-deep">รอสักครู่...</p>
          </>
        )}
        {state === "error" && (
          <>
            <div className="mb-3 text-4xl">😢</div>
            <p className="font-display text-lg font-bold text-plum-deep">{errorMsg}</p>
          </>
        )}
      </FadeIn>
    </main>
  );
}
