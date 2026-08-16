"use client";

import { useState } from "react";

type DayReps = { day: string; reps: number };

export default function DailyRepsChart({ data }: { data: DayReps[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const repsByDate = new Map(data.map((d) => [d.day, d.reps]));

  // fill every day of the month (including zeros) so bar spacing maps to
  // the real calendar instead of only showing the days that had activity
  const series = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateKey = `${year}-${(month + 1).toString().padStart(2, "0")}-${dayNum
      .toString()
      .padStart(2, "0")}`;
    return { dayNum, reps: repsByDate.get(dateKey) ?? 0 };
  });

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink/50">
        ยังไม่มีข้อมูลเดือนนี้ — เริ่มวิดพื้นวันนี้เพื่อเห็นกราฟ
      </p>
    );
  }

  const max = Math.max(...series.map((d) => d.reps), 1);
  const width = 600;
  const height = 180;
  const barGap = 3;
  const barWidth = width / series.length - barGap;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + 26}`}
        className="w-full"
        style={{ minWidth: Math.max(420, series.length * 14) }}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-primary-deep)" />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line x1={0} y1={height} x2={width} y2={height} stroke="rgba(20,37,27,0.08)" strokeWidth={1} />

        {series.map((d, i) => {
          const barHeight = d.reps === 0 ? 0 : Math.max(4, (d.reps / max) * height);
          const x = i * (barWidth + barGap);
          const y = height - barHeight;
          const isHovered = hovered === i;
          const showLabel = series.length <= 15 || d.dayNum % 5 === 0 || d.dayNum === 1;

          return (
            <g key={d.dayNum}>
              {/* invisible full-height hit target so hovering works even on zero-days */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={height}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={
                  d.reps === 0 ? "rgba(20,37,27,0.06)" : isHovered ? "var(--color-sun)" : "url(#barGradient)"
                }
                className="transition-colors duration-150"
              />
              {isHovered && (
                <text
                  x={x + barWidth / 2}
                  y={Math.max(12, y - 6)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--color-primary-deep)"
                >
                  {d.reps}
                </text>
              )}
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y={height + 18}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--color-ink)"
                  opacity={0.4}
                >
                  {d.dayNum}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
