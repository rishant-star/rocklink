import type { Gesture } from "@rocklink/shared-types";
import { GESTURES } from "./Difficulty";

/** How many rounds of player history are retained in total. */
const HISTORY_WINDOW = 20;
/** How many of the most recent rounds actually feed the prediction. */
const PREDICTION_WINDOW = 10;

/**
 * Tracks the human player's recent gesture history and predicts their
 * most likely next move by frequency within a recent window. Pure,
 * isolated state (no React, no module-level singleton) — useAIMatch
 * creates one instance per match via a ref, so history never leaks
 * across a "Change Difficulty" restart or between separate matches.
 */
export class AdaptiveStrategy {
  private history: Gesture[] = [];

  record(gesture: Gesture): void {
    this.history.push(gesture);
    if (this.history.length > HISTORY_WINDOW) {
      this.history.shift();
    }
  }

  /**
   * The most frequent gesture across the last PREDICTION_WINDOW
   * rounds, or null if the player hasn't thrown anything yet this
   * match. Ties resolve to whichever qualifying gesture comes first in
   * ROCK/PAPER/SCISSORS order — deterministic rather than random, so
   * the "small randomness" the AI needs comes only from AIEngine's own
   * explicit random-guess chance, not from a hidden tiebreak.
   */
  predictNext(): Gesture | null {
    if (this.history.length === 0) return null;

    const recent = this.history.slice(-PREDICTION_WINDOW);
    const counts: Record<Gesture, number> = { ROCK: 0, PAPER: 0, SCISSORS: 0 };
    for (const gesture of recent) counts[gesture] += 1;

    let best: Gesture = recent[0];
    let bestCount = -1;
    for (const gesture of GESTURES) {
      if (counts[gesture] > bestCount) {
        bestCount = counts[gesture];
        best = gesture;
      }
    }
    return best;
  }

  reset(): void {
    this.history = [];
  }
}
