"use client";

import { useEffect, useState } from "react";

interface RepRingProps {
  value: number;
  goal: number;
  label: string;
  size?: number;
}

export default function RepRing({
  value,
  goal,
  label,
  size = 220,
}: RepRingProps) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / goal, 1);
  const offset = circumference * (1 - progress);

  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);

    const timer = setTimeout(() => {
      setPulse(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div
      className={`glass relative flex items-center justify-center rounded-full
        transition-transform duration-300
        ${pulse ? "scale-[1.04]" : "scale-100"}
      `}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute inset-4 rounded-full
        bg-primary/10 blur-2xl"
      />

      <svg
        width={size}
        height={size}
        className="relative -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(14,107,57,0.12)"
          strokeWidth={stroke}
        />

        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#repRingGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />

        <defs>
          <linearGradient
            id="repRingGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#1fae5b" />
            <stop offset="100%" stopColor="#0e6b39" />
          </linearGradient>
        </defs>
      </svg>

      {/* Number */}
      <div className="absolute flex flex-col items-center">
        <span
          className={`font-display text-5xl font-bold text-primary-deep
            transition-transform duration-300
            ${pulse ? "scale-110" : "scale-100"}
          `}
        >
          {value}
        </span>

        <span className="text-sm text-ink/60">
          / {goal} {label}
        </span>
      </div>
    </div>
  );
}