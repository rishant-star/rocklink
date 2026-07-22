import type { HandLandmarks, Landmark } from "../types";

/**
 * MediaPipe Hands' fixed 21-point landmark indices.
 * https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
 */
export const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const;

export function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * For the four non-thumb fingers: a finger is "extended" when its
 * fingertip sits farther from the wrist than its PIP joint does. This
 * is more orientation-tolerant than comparing raw y-coordinates, since
 * it doesn't assume the hand is held perfectly upright.
 *
 * Returns a signed margin (normalized by PIP-to-wrist distance) rather
 * than a boolean, so the classifier can also derive a confidence score
 * from how decisively extended/curled each finger is.
 */
export function fingerExtensionMargin(
  landmarks: HandLandmarks,
  tipIndex: number,
  pipIndex: number,
): number {
  const wrist = landmarks[LANDMARK.WRIST];
  const tipDist = distance(landmarks[tipIndex], wrist);
  const pipDist = distance(landmarks[pipIndex], wrist);
  if (pipDist === 0) return 0;
  return (tipDist - pipDist) / pipDist;
}

/**
 * The thumb curls sideways across the palm rather than up/down, so it
 * needs a different check: lateral distance from the thumb tip to the
 * pinky's MCP joint (roughly the base of the palm on the opposite
 * side). A curled thumb tucks in close to the palm; an extended thumb
 * splays away from it.
 */
export function thumbExtensionMargin(landmarks: HandLandmarks): number {
  const wrist = landmarks[LANDMARK.WRIST];
  const thumbTip = landmarks[LANDMARK.THUMB_TIP];
  const pinkyMcp = landmarks[LANDMARK.PINKY_MCP];
  const palmWidth = distance(pinkyMcp, wrist);
  if (palmWidth === 0) return 0;
  return (distance(thumbTip, pinkyMcp) - palmWidth) / palmWidth;
}
