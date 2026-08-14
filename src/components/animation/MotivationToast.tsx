"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function MotivationToast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-deep/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
