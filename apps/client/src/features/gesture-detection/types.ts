import type { Gesture } from "@rocklink/shared-types";

/**
 * A single MediaPipe Hands landmark: normalized [0,1] coordinates
 * relative to the video frame. z is relative depth (not used by our
 * classifier, kept for completeness / future use).
 */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** All 21 landmarks for one detected hand, in MediaPipe's fixed index order. */
export type HandLandmarks = Landmark[];

export interface ClassificationResult {
  gesture: Gesture | "UNKNOWN";
  confidence: number;
}

/**
 * Additional per-frame data MediaPipe's Results object already contains
 * but the pipeline previously discarded (only `landmarks` and the
 * *stabilized* gesture were ever surfaced). Purely diagnostic/display
 * data — nothing here feeds back into classification or stabilization.
 */
export interface FrameDiagnostics {
  /** MediaPipe's own handedness label + its confidence in that label. */
  handedness: { label: "Left" | "Right"; confidence: number } | null;
  /** The raw (non-stabilized, non-rounded) per-frame classification — for HUD/debug display only. */
  rawGesture: ClassificationResult;
  /** How many fingers are extended (0–5) this frame — debug display only, not used for gameplay classification. */
  fingerCount: number;
}
