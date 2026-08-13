"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

export default function PageTransition({
  children,
}: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{
          opacity: 0,
          y: 8,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          y: -8,
        }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
        }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
