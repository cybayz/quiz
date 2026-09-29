"use client";

import confetti from "canvas-confetti";

export function fireSuccessConfetti() {
  try {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#ec4899"],
      ticks: 200,
      gravity: 1.2,
      scalar: 0.9,
    });
  } catch (e) {
    console.error("Confetti error", e);
  }
}

export function fireGrandCelebration() {
  try {
    const end = Date.now() + 2.5 * 1000;
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } catch (e) {
    console.error("Celebration error", e);
  }
}
