"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface GlassButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "plum" | "ghost";
  /** sm = compact inline actions, md = default, lg = primary CTAs. */
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function GlassButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: GlassButtonProps) {
  return (
    <button
      {...props}
      className={twMerge(
        `
        group relative overflow-hidden
        rounded-2xl
        font-display font-semibold
        transition-all duration-200
        active:scale-[0.96]
        hover:-translate-y-0.5
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:hover:translate-y-0
        disabled:active:scale-100
        `,
        sizeClasses[size],
        variant === "primary"
          ? `
            bg-primary
            text-white
            shadow-lg shadow-primary/20
            hover:bg-primary-deep
            hover:shadow-xl hover:shadow-primary/25
          `
          : variant === "plum"
            ? `
              bg-plum
              text-white
              shadow-lg shadow-plum/20
              hover:bg-plum-deep
              hover:shadow-xl hover:shadow-plum/25
            `
            : variant === "ghost"
              ? `
                glass
                text-ink
                hover:bg-white/70
                hover:shadow-lg
              `
              : `
                glass
                text-primary-deep
                hover:bg-white/70
                hover:shadow-lg
              `,
        className
      )}
    >
      {/* Shine effect */}
      <span
        className="
          pointer-events-none
          absolute inset-0
          -translate-x-full
          bg-gradient-to-r
          from-transparent
          via-white/25
          to-transparent
          transition-transform
          duration-700
          group-hover:translate-x-full
        "
      />

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}
