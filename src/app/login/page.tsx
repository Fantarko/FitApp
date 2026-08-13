"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GlassButton from "@/components/ui/GlassButton";
import ScaleIn from "@/components/animation/ScaleIn";

export default function LoginPage() {
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?consent=1&next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-plum/15 blur-3xl" />
      </div>

      <div className="glass w-full max-w-sm rounded-[24px] p-8 text-center">
        <ScaleIn>
        <h1 className="font-display text-2xl font-bold text-primary-deep">
          เข้าสู่ระบบ
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          ใช้บัญชี Google ของคุณเพื่อเริ่มเก็บสถิติวิดพื้น
        </p>

        <label className="mt-6 flex items-start gap-3 rounded-2xl bg-white/40 p-4 text-left text-sm text-ink/70">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
          />
          <span>
            ฉันยินยอมให้เก็บข้อมูลบัญชีและสถิติการออกกำลังกายของฉัน
            ตามนโยบายความเป็นส่วนตัว (PDPA) — การประมวลผลภาพจากกล้อง
            จะทำบนอุปกรณ์ของฉันเท่านั้น ไม่มีการส่งวิดีโอขึ้นเซิร์ฟเวอร์
          </span>
        </label>

        <GlassButton
          variant="primary"
          className="mt-6 w-full"
          disabled={!consent || loading}
          onClick={handleGoogleLogin}
        >
          {loading ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วย Google"}
        </GlassButton>
        </ScaleIn>
      </div>
    </main>
  );
}
