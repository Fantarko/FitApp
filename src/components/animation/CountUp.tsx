"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type CountUpProps = {
  value: number;
  duration?: number;
  className?: string;
};

export default function CountUp({
  value,
  duration = 0.8,
  className,
}: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const start = performance.now();

    const update = (time: number) => {
      const progress = Math.min(
        (time - start) / (duration * 1000),
        1
      );

      const eased = 1 - Math.pow(1 - progress, 3);

      setCount(Math.round(value * eased));

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value, duration]);

  return (
    <motion.span
      key={value}
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className={className}
    >
      {count}
    </motion.span>
  );
}