"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type ScaleInProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function ScaleIn({
  children,
  delay = 0,
  className,
}: ScaleInProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.85,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        delay,
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}