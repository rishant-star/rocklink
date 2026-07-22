import type { ClassificationResult } from "../types";

const REQUIRED_CONSECUTIVE_FRAMES = 5; // ~330ms at the 15fps detection cap

export interface StabilizedState {
  /** null = no confidently-stable gesture right now (hand absent, mid-transition, or ambiguous). */
  gesture: ClassificationResult["gesture"] | null;
  confidence: number;
}

/**
 * Small stateful buffer (a plain class, not a React hook — it's driven
 * from inside the MediaPipe onResults callback, which runs outside
 * React's render cycle). `update()` is called every frame and always
 * returns the *current* stabilized view: null until a gesture has held
 * for REQUIRED_CONSECUTIVE_FRAMES consecutive frames, and immediately
 * back to null the moment the hand goes ambiguous — this is a live
 * calibration readout, not a one-shot lock, so it should reflect what's
 * true right now rather than sticking to a stale value.
 */
export class GestureStabilizer {
  private candidateGesture: ClassificationResult["gesture"] | null = null;
  private consecutiveCount = 0;
  private stable: StabilizedState = { gesture: null, confidence: 0 };

  update(result: ClassificationResult): StabilizedState {
    if (result.gesture === "UNKNOWN") {
      this.reset();
      return this.stable;
    }

    if (result.gesture === this.candidateGesture) {
      this.consecutiveCount += 1;
    } else {
      this.candidateGesture = result.gesture;
      this.consecutiveCount = 1;
    }

    this.stable =
      this.consecutiveCount >= REQUIRED_CONSECUTIVE_FRAMES
        ? { gesture: this.candidateGesture, confidence: result.confidence }
        : { gesture: null, confidence: 0 };

    return this.stable;
  }

  reset(): void {
    this.candidateGesture = null;
    this.consecutiveCount = 0;
    this.stable = { gesture: null, confidence: 0 };
  }
}
