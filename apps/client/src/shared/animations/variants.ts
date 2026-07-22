import type { Variants } from "framer-motion";

/**
 * Named animation variants reused across features, per
 * Design-System.md Section 5. Avoid ad-hoc inline animation props in
 * feature components — import from here so the motion language stays
 * consistent product-wide.
 */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeInOut" } },
};

export const glowPulse: Variants = {
  initial: { boxShadow: "0 0 0px rgba(0,255,136,0)" },
  pulse: {
    boxShadow: [
      "0 0 0px rgba(0,255,136,0)",
      "0 0 24px rgba(0,255,136,0.6)",
      "0 0 0px rgba(0,255,136,0)",
    ],
    transition: { duration: 1.4, repeat: Infinity },
  },
};

export const cardFlip: Variants = {
  hidden: { rotateY: 180, opacity: 0 },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: { duration: 0.6, type: "spring", stiffness: 260, damping: 20 },
  },
};

export const countdownPop: Variants = {
  hidden: { scale: 0.4, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
  exit: { scale: 1.4, opacity: 0, transition: { duration: 0.2 } },
};

export const scoreTick: Variants = {
  tick: {
    scale: [1, 1.25, 1],
    transition: { duration: 0.35, ease: "easeOut" },
  },
};
