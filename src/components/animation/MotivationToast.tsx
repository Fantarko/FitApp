"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HYPE_VARIANTS } from "@/lib/hypeAnimations";

export default function MotivationToast({
  message,
  variantIndex,
}: {
  message: string | null;
  /** 0-9 — picks which of the 10 pseudo-3D pop animations to play. */
  variantIndex: number;
}) {
  const variant = HYPE_VARIANTS[((variantIndex % HYPE_VARIANTS.length) + HYPE_VARIANTS.length) % HYPE_VARIANTS.length];

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-0 top-4 z-20 flex flex-col items-center gap-1"
          style={{ perspective: 600 }}
        >
          <motion.span
            initial={variant.initial}
            animate={variant.animate}
            transition={variant.transition}
            className="text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
            style={{ transformStyle: "preserve-3d", display: "inline-block" }}
          >
            {variant.icon}
          </motion.span>

          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.25 }}
            className="whitespace-nowrap rounded-full bg-primary-deep/90 px-4 py-1.5 text-sm font-medium text-white shadow-lg backdrop-blur"
          >
            {message}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
