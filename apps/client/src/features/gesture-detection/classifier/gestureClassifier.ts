import type { ClassificationResult, HandLandmarks } from "../types";
import { LANDMARK, fingerExtensionMargin, thumbExtensionMargin } from "./landmarkGeometry";

// Margins are normalized ratios (see landmarkGeometry.ts). A small dead
// zone around zero avoids flip-flopping when a finger is only barely
// past neutral.
const EXTENDED_THRESHOLD = 0.1;
const CURLED_THRESHOLD = -0.1;

function isExtended(margin: number): boolean {
  return margin > EXTENDED_THRESHOLD;
}
function isCurled(margin: number): boolean {
  return margin < CURLED_THRESHOLD;
}

/**
 * Pure function: 21 landmarks in, a classification out. No MediaPipe,
 * no React, no side effects — fully unit-testable in isolation, per
 * Blueprint Section 13's testing priorities.
 */
export function classifyGesture(landmarks: HandLandmarks): ClassificationResult {
  const index = fingerExtensionMargin(landmarks, LANDMARK.INDEX_TIP, LANDMARK.INDEX_PIP);
  const middle = fingerExtensionMargin(landmarks, LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_PIP);
  const ring = fingerExtensionMargin(landmarks, LANDMARK.RING_TIP, LANDMARK.RING_PIP);
  const pinky = fingerExtensionMargin(landmarks, LANDMARK.PINKY_TIP, LANDMARK.PINKY_PIP);
  const thumb = thumbExtensionMargin(landmarks);

  const margins = [index, middle, ring, pinky];
  const confidence = clamp01(average(margins.map(Math.abs)));

  const allExtended = margins.every(isExtended);
  const allCurled = margins.every(isCurled);
  const scissorsPattern =
    isExtended(index) && isExtended(middle) && isCurled(ring) && isCurled(pinky);

  if (allExtended) {
    return { gesture: "PAPER", confidence };
  }
  if (allCurled) {
    // Thumb position doesn't change ROCK's classification (a fist with
    // the thumb tucked in or resting alongside is still a fist), but a
    // clearly-extended thumb alongside four curled fingers reads as a
    // less certain fist, so it dampens confidence rather than changing
    // the result.
    const thumbDampening = isExtended(thumb) ? 0.5 : 1;
    return { gesture: "ROCK", confidence: confidence * thumbDampening };
  }
  if (scissorsPattern) {
    return { gesture: "SCISSORS", confidence };
  }

  return { gesture: "UNKNOWN", confidence: 0 };
}

/**
 * How many of the 5 fingers are currently extended (0–5). Debug/HUD
 * display only — RockLink's actual gameplay classification is
 * ROCK/PAPER/SCISSORS via classifyGesture above, not a raw finger
 * count. Reuses the exact same fingerExtensionMargin/
 * thumbExtensionMargin/isExtended this file already computes for
 * classification, just summarized differently, so there's exactly one
 * definition of "extended" in the codebase rather than a second one
 * that could quietly disagree with it.
 */
export function countExtendedFingers(landmarks: HandLandmarks): number {
  const index = fingerExtensionMargin(landmarks, LANDMARK.INDEX_TIP, LANDMARK.INDEX_PIP);
  const middle = fingerExtensionMargin(landmarks, LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_PIP);
  const ring = fingerExtensionMargin(landmarks, LANDMARK.RING_TIP, LANDMARK.RING_PIP);
  const pinky = fingerExtensionMargin(landmarks, LANDMARK.PINKY_TIP, LANDMARK.PINKY_PIP);
  const thumb = thumbExtensionMargin(landmarks);
  return [index, middle, ring, pinky, thumb].filter(isExtended).length;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
