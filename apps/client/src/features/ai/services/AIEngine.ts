import type { Gesture } from "@rocklink/shared-types";
import { BEATS } from "@rocklink/shared-types";
import { GESTURES, type AIDifficulty } from "./Difficulty";
import type { AdaptiveStrategy } from "./AdaptiveStrategy";

function randomGesture(): Gesture {
  return GESTURES[Math.floor(Math.random() * GESTURES.length)];
}

/**
 * The gesture that beats `gesture` — the inverse of the shared BEATS
 * map (which reads "key beats value"). Reusing BEATS instead of a
 * second hardcoded win table is what keeps the AI's counter-logic and
 * GameEngine's win-cycle from ever being able to disagree.
 */
function counterTo(gesture: Gesture): Gesture {
  const attacker = GESTURES.find((candidate) => BEATS[candidate] === gesture);
  return attacker ?? randomGesture();
}

export interface AIMoveContext {
  difficulty: AIDifficulty;
  /** The player's most recent locked gesture, or null on the match's first round. */
  playerLastMove: Gesture | null;
  /** Shared per-match instance; ADAPTIVE reads a prediction from it. Never mutated here — recording a move is useAIMatch's job once the round resolves. */
  adaptiveStrategy: AdaptiveStrategy;
}

/**
 * Chooses the AI's move for one round per the selected difficulty.
 * Pure aside from Math.random(). See RockLink-Project-Blueprint-style
 * spec this implements:
 *
 * - EASY: uniform random across all three gestures.
 * - NORMAL: 75% random, 25% counters the player's last move.
 * - HARD: 80% counters the player's last move, 20% random (so it can
 *   still "make mistakes").
 * - ADAPTIVE: counters AdaptiveStrategy's prediction of the player's
 *   next move (based on their last ~10 of up to 20 tracked rounds),
 *   with a small random chance to avoid feeling robotic.
 *
 * Falls back to a random throw whenever there's no move to counter yet
 * (first round of a match) — never throws an error, never stalls.
 */
export function chooseAIMove({ difficulty, playerLastMove, adaptiveStrategy }: AIMoveContext): Gesture {
  switch (difficulty) {
    case "EASY":
      return randomGesture();

    case "NORMAL": {
      const shouldCounter = Math.random() < 0.25;
      if (shouldCounter && playerLastMove) return counterTo(playerLastMove);
      return randomGesture();
    }

    case "HARD": {
      const shouldCounter = Math.random() < 0.8;
      if (shouldCounter && playerLastMove) return counterTo(playerLastMove);
      return randomGesture();
    }

    case "ADAPTIVE": {
      const shouldGuessRandomly = Math.random() < 0.15;
      const prediction = adaptiveStrategy.predictNext();
      if (shouldGuessRandomly || !prediction) return randomGesture();
      return counterTo(prediction);
    }

    default:
      return randomGesture();
  }
}
