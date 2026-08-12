"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

type ConfettiProps = {
  trigger: boolean;
};

export default function Confetti({
  trigger,
}: ConfettiProps) {
  useEffect(() => {
    if (!trigger) return;

    confetti({
      particleCount: 120,
      spread: 80,
      origin: {
        y: 0.65,
      },
    });
  }, [trigger]);

  return null;
}