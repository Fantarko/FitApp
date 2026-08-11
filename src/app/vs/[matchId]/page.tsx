"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  Copy,
  Swords,
} from "lucide-react";

import PushupCamera from "@/components/PushupCamera";

export default function VsMatchPage() {
  const params = useParams();
  const router = useRouter();

  const [matchId, setMatchId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const copyMatchId = async () => {
    if (!matchId) return;

    try {
      await navigator.clipboard.writeText(matchId);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // Clipboard อาจถูก block ในบาง browser
    }
  };

  /*
   * Loading
   */
  if (!matchId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent px-4">
        <div className="flex flex-col items-center text-center">

          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white/60 shadow-sm">
            <Activity
              size={20}
              strokeWidth={1.8}
              className="animate-pulse text-plum-deep"
            />
          </div>

          <h1 className="text-sm font-semibold text-plum-deep">
            กำลังเตรียมการแข่งขัน
          </h1>

          <p className="mt-1.5 text-xs text-ink/40">
            กำลังโหลดข้อมูลการแข่งขัน...
          </p>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">

        {/* =========================================
            Navigation
        ========================================== */}

        <button
          type="button"
          onClick={() => router.back()}
          className="
            mb-7
            inline-flex
            items-center
            gap-2
            rounded-lg
            py-1.5
            pr-3
            text-sm
            font-medium
            text-ink/45
            transition
            hover:bg-black/[0.03]
            hover:text-ink
          "
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          กลับ
        </button>

        {/* =========================================
            Header
        ========================================== */}

        <header className="mb-7">

          {/* Section Label */}
          <div
            className="
              mb-4
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-plum-deep/10
              bg-white/50
              px-3
              py-1.5
              backdrop-blur-sm
            "
          >
            <Swords
              size={14}
              strokeWidth={2}
              className="text-plum-deep"
            />

            <span
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.18em]
                text-plum-deep
              "
            >
              VS MATCH
            </span>
          </div>

          {/* Title */}
          <h1
            className="
              font-display
              text-3xl
              font-bold
              tracking-tight
              text-plum-deep
              sm:text-4xl
            "
          >
            พร้อมหรือยัง?
          </h1>

          <p
            className="
              mt-2
              max-w-lg
              text-sm
              leading-6
              text-ink/55
            "
          >
            เตรียมท่าวิดพื้นให้พร้อม
            <br />
            เมื่อการแข่งขันเริ่ม พยายามทำจำนวนครั้งให้ได้มากที่สุด
          </p>

        </header>

        {/* =========================================
            Match Information
        ========================================== */}

        <section
          className="
            mb-5
            rounded-2xl
            border
            border-black/[0.07]
            bg-white/45
            p-4
            shadow-sm
            backdrop-blur-xl
          "
        >
          <div className="flex items-center justify-between gap-4">

            {/* Match ID */}

            <div className="min-w-0">

              <div
                className="
                  mb-1
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-ink/35
                "
              >
                Match ID
              </div>

              <div className="flex min-w-0 items-center gap-2">

                <span
                  className="
                    truncate
                    font-mono
                    text-sm
                    font-semibold
                    text-plum-deep
                  "
                  title={matchId}
                >
                  {matchId}
                </span>

                <button
                  type="button"
                  onClick={copyMatchId}
                  aria-label="Copy Match ID"
                  className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    text-ink/35
                    transition
                    hover:bg-black/[0.05]
                    hover:text-ink
                    active:scale-95
                  "
                >
                  {copied ? (
                    <Check
                      size={14}
                      strokeWidth={2}
                    />
                  ) : (
                    <Copy
                      size={14}
                      strokeWidth={1.8}
                    />
                  )}
                </button>

              </div>

            </div>

            {/* Match Status */}

            <div
              className="
                flex
                shrink-0
                items-center
                gap-2
                rounded-full
                border
                border-green-500/10
                bg-green-500/[0.06]
                px-2.5
                py-1.5
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

              <span className="text-xs font-medium text-ink/55">
                พร้อมแข่งขัน
              </span>
            </div>

          </div>
        </section>

        {/* =========================================
            Camera / Pushup Area
        ========================================== */}

        <section className="w-full">
          <PushupCamera
            mode="vs"
            matchId={matchId}
          />
        </section>

      </div>
    </main>
  );
}

