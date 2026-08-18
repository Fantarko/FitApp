import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlobBackground from "@/components/BlobBackground";
import FadeIn from "@/components/animation/FadeIn";

type Row = {
  user_id: string;
  display_name: string | null;
  reps: number;
  rank: number;
};

type Period = "weekly" | "monthly" | "all-time";

const periods: { key: Period; label: string }[] = [
  { key: "weekly", label: "สัปดาห์นี้" },
  { key: "monthly", label: "เดือนนี้" },
  { key: "all-time", label: "ตลอดกาล" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/leaderboard");
  }

  const params = await searchParams;

  const period: Period = periods.some((item) => item.key === params.period)
    ? (params.period as Period)
    : "monthly";

  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_period: period,
  });

  const rows = (data ?? []) as Row[];

  const me = rows.find((row) => row.user_id === user.id);

  const periodLabel =
    period === "weekly"
      ? "สัปดาห์นี้"
      : period === "all-time"
        ? "ตลอดกาล"
        : "เดือนนี้";

  const renderRows = (items: Row[]) => (
    <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.05] bg-white/55">
      <ol className="divide-y divide-black/[0.05]">
        {items.map((row) => {
          const isMe = row.user_id === user.id;
          const isTopThree = row.rank <= 3;

          return (
            <li
              key={row.user_id}
              className={[
                "flex items-center gap-3 px-4 py-3.5 transition",
                "hover:bg-black/[0.02]",
                isMe ? "bg-primary/[0.07]" : "",
              ].join(" ")}
            >
              <div className="flex w-9 shrink-0 justify-center">
                {row.rank === 1 ? (
                  <span className="text-lg">🥇</span>
                ) : row.rank === 2 ? (
                  <span className="text-lg">🥈</span>
                ) : row.rank === 3 ? (
                  <span className="text-lg">🥉</span>
                ) : (
                  <span className="text-sm font-semibold text-ink/35">
                    {row.rank}
                  </span>
                )}
              </div>

              <Link
                href={`/friends/${row.user_id}`}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "truncate text-sm",
                      isMe
                        ? "font-semibold text-primary-deep"
                        : "font-medium text-ink",
                    ].join(" ")}
                  >
                    {row.display_name ?? "ผู้เล่นไม่ระบุชื่อ"}
                  </span>

                  {isMe && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary-deep">
                      คุณ
                    </span>
                  )}
                </div>
              </Link>

              <div className="text-right">
                <div
                  className={[
                    "font-display text-sm font-bold",
                    isTopThree
                      ? "text-primary-deep"
                      : "text-ink/70",
                  ].join(" ")}
                >
                  {Number(row.reps).toLocaleString()}
                </div>
                <div className="text-[10px] text-ink/35">ครั้ง</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <main className="relative min-h-full flex-1 overflow-hidden px-5 py-8 md:px-10 md:py-10">
      <BlobBackground
        colors={[
          "var(--color-primary)",
          "var(--color-plum)",
        ]}
      />

      <div className="relative mx-auto max-w-4xl">
        <FadeIn>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
                Leaderboard
              </p>

              <h1 className="font-display text-3xl font-bold tracking-tight text-primary-deep md:text-4xl">
                อันดับ
              </h1>

              <p className="mt-1.5 text-sm text-ink/50">
                ใครวิดพื้นได้มากที่สุดในช่วง{periodLabel}
              </p>
            </div>

            {me && (
              <div className="w-fit rounded-2xl border border-black/[0.05] bg-white/65 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-medium text-ink/40">
                  อันดับของคุณ
                </p>

                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-display text-xl font-bold text-plum-deep">
                    #{me.rank}
                  </span>

                  <span className="text-xs text-ink/40">
                    · {Number(me.reps).toLocaleString()} ครั้ง
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-1 rounded-xl bg-black/[0.035] p-1 sm:w-fit">
            {periods.map((item) => {
              const active = period === item.key;

              return (
                <Link
                  key={item.key}
                  href={`/leaderboard?period=${item.key}`}
                  className={[
                    "rounded-lg px-4 py-2 text-xs font-semibold transition",
                    active
                      ? "bg-white text-primary-deep shadow-sm"
                      : "text-ink/45 hover:text-ink/70",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </FadeIn>

        <FadeIn
          delay={0.08}
          className="glass mt-6 rounded-[24px] p-4 sm:p-5"
        >
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                ทั่วโลก
              </h2>

              <p className="mt-0.5 text-xs text-ink/40">
                จัดอันดับจากจำนวนวิดพื้นที่บันทึกไว้
              </p>
            </div>

            <span className="rounded-full bg-black/[0.035] px-3 py-1.5 text-[10px] font-medium text-ink/45">
              {periodLabel}
            </span>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200/70 bg-red-50/70 p-4">
              <p className="text-sm font-semibold text-red-700">
                โหลดอันดับไม่สำเร็จ
              </p>

              <p className="mt-1 text-xs leading-relaxed text-red-600/80">
                {error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลอันดับ"}
              </p>
            </div>
          ) : rows.length > 0 ? (
            renderRows(rows)
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-black/10 px-5 py-10 text-center">
              <p className="text-sm font-medium text-ink/50">
                ยังไม่มีข้อมูลอันดับ
              </p>

              <p className="mt-1 text-xs text-ink/35">
                เริ่มบันทึกการวิดพื้นเพื่อขึ้นอันดับ
              </p>
            </div>
          )}
        </FadeIn>
      </div>
    </main>
  );
}