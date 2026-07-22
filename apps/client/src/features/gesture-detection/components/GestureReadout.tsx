import { AnimatePresence, motion } from "framer-motion";
import type { Gesture } from "@rocklink/shared-types";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Text } from "@/shared/components/Text";
import { Heading } from "@/shared/components/Heading";
import { fadeUp } from "@/shared/animations/variants";

interface GestureReadoutProps {
  gesture: Gesture | "UNKNOWN" | null;
  confidence: number;
  /**
   * Whether a hand is currently visible at all — distinct from
   * `gesture` being null, which also covers "hand visible but not yet
   * a stable gesture." Without this, SCANNING and TRACKING can't be
   * told apart (see GestureCalibrationStage for where this comes from).
   */
  hasHand: boolean;
}

type Status = "scanning" | "tracking" | "locked";

function formatGesture(gesture: Gesture): string {
  return gesture.charAt(0) + gesture.slice(1).toLowerCase();
}

/**
 * Main HUD status readout: SCANNING / TRACKING / LOCKED, crossfading
 * via the existing `fadeUp` variant (Design-System.md Section 5) rather
 * than a new transition — the RC HUD brief asks for "smooth
 * transitions," not a new animation language.
 */
export function GestureReadout({ gesture, confidence, hasHand }: GestureReadoutProps) {
  const label = gesture && gesture !== "UNKNOWN" ? gesture : null;
  const status: Status = !hasHand ? "scanning" : label ? "locked" : "tracking";

  const glow = status === "locked" ? "primary" : status === "tracking" ? "secondary" : "none";

  return (
    <GlassPanel
      glow={glow}
      className="flex flex-col items-center gap-2 text-center"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {status === "scanning" && (
          <motion.div
            key="scanning"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex flex-col items-center gap-1"
          >
            <Text size="caption" tone="muted" className="tracking-widest text-secondary">
              Searching for hand…
            </Text>
            <Text size="caption" tone="muted" className="normal-case tracking-normal">
              Position your hand in frame
            </Text>
          </motion.div>
        )}

        {status === "tracking" && (
          <motion.div
            key="tracking"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex flex-col items-center gap-1"
          >
            <Text size="caption" tone="muted" className="tracking-widest text-secondary">
              Tracking
            </Text>
            <Text size="caption" tone="muted" className="normal-case tracking-normal">
              Hold a steady gesture
            </Text>
          </motion.div>
        )}

        {status === "locked" && label && (
          <motion.div
            key="locked"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex flex-col items-center gap-2"
          >
            <Text size="caption" tone="muted" className="tracking-widest text-success">
              Locked
            </Text>
            <Heading level="md" as="p">
              {formatGesture(label)}
            </Heading>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-glass">
              <div
                className="h-full bg-secondary transition-all duration-150"
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
}
