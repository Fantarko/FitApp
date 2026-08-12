"use client";

import { motion } from "framer-motion";

type PopNumberProps = {
  value: number;
  prefix?: string;
  className?: string;
};

export default function PopNumber({
  value,
  prefix = "+",
  className,
}: PopNumberProps) {
  return (
    <motion.div
      key={value}
      initial={{
        opacity: 0,
        scale: 0.5,
        y: 12,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 18,
      }}
      className={className}
    >
      {prefix}
      {value}
    </motion.div>
  );
}