"use client";

import { useState } from "react";

type DayReps = { day: string; reps: number };

export default function DailyRepsChart({ data }: { data: DayReps[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink/50">
        ยังไม่มีข้อมูลเดือนนี้ — เริ่มวิดพื้นวันนี้เพื่อเห็นกราฟ
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.reps), 1);
  const width = 600;
  const height = 180;
  const barGap = 4;
  const barWidth = data.length > 0 ? width / data.length - barGap : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + 24}`}
        className="w-full"
        style={{ minWidth: Math.max(360, data.length * 18) }}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-primary-deep)" />
          </linearGradient>
        </defs>

        {data.map((d, i) => {
          const barHeight = (d.reps / max) * height;
          const x = i * (barWidth + barGap);
          const y = height - barHeight;
          const dayNum = new Date(d.day).getDate();
          const isHovered = hovered === i;

          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={isHovered ? "var(--color-sun)" : "url(#barGradient)"}
                className="transition-all duration-150"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {isHovered && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--color-primary-deep)"
                >
                  {d.reps}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-ink)"
                opacity={0.4}
              >
                {dayNum}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
