"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type SlideDirection = "left" | "right" | "up" | "down";

type SlideInProps = {
  children: ReactNode;
  direction?: SlideDirection;
  delay?: number;
  className?: string;
};

export default function SlideIn({
  children,
  direction = "up",
  delay = 0,
  className,
}: SlideInProps) {
  const offset = 30;

  const positions = {
    left: { x: -offset, y: 0 },
    right: { x: offset, y: 0 },
    up: { x: 0, y: offset },
    down: { x: 0, y: -offset },
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...positions[direction],
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      transition={{
        delay,
        duration: 0.45,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}