interface RepRingProps {
  value: number;
  goal: number;
  label: string;
  size?: number;
}

export default function RepRing({ value, goal, label, size = 220 }: RepRingProps) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / goal, 1);
  const offset = circumference * (1 - progress);

  return (
    <div
      className="glass relative flex items-center justify-center rounded-full"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(14,107,57,0.12)"
          strokeWidth={stroke}
        />
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
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
        <defs>
          <linearGradient id="repRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1fae5b" />
            <stop offset="100%" stopColor="#0e6b39" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-5xl font-bold text-primary-deep">
          {value}
        </span>
        <span className="text-sm text-ink/60">/ {goal} {label}</span>
      </div>
    </div>
  );
}
