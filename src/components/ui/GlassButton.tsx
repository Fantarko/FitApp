import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "sun" | "plum" | "ghost";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-primary/90 to-primary-deep/90 text-white border-white/40 shadow-[0_8px_28px_rgba(14,107,57,0.35)]",
  sun:
    "bg-gradient-to-br from-sun/90 to-sun-deep/90 text-white border-white/40 shadow-[0_8px_28px_rgba(201,127,22,0.35)]",
  plum:
    "bg-gradient-to-br from-plum/90 to-plum-deep/90 text-white border-white/40 shadow-[0_8px_28px_rgba(86,75,209,0.35)]",
  ghost:
    "bg-white/30 text-ink border-white/60 shadow-[0_8px_28px_rgba(14,107,57,0.12)]",
};

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export default function GlassButton({
  variant = "primary",
  icon,
  className = "",
  children,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2",
        "rounded-[20px] border backdrop-blur-xl backdrop-saturate-150",
        "px-6 py-3 font-display font-semibold text-[15px] tracking-tight",
        "transition-transform duration-150 active:scale-[0.97]",
        "hover:brightness-105 disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
