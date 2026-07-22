import type { Gesture, LockedGesture, MatchResult, PlayerId } from "./game.js";

/**
 * The single source of truth for "what beats what." Lived only inside
 * apps/server/src/game/GameEngine.ts until the AI mode needed the exact
 * same comparison client-side with no server round-trip. Moved here
 * (not duplicated) so GameEngine.compare() and the AI's local match
 * resolution are provably the same algorithm, not two copies that could
 * drift apart.
 */
export const BEATS: Record<Gesture, Gesture> = {
  ROCK: "SCISSORS",
  PAPER: "ROCK",
  SCISSORS: "PAPER",
};

/**
 * Pure game logic — no socket knowledge, no side effects, identical
 * behavior to the original server-only GameEngine.compare(). See
 * GameEngine's own doc comment for the NONE-handling rationale.
 */
export function compareGestures(p1Gesture: LockedGesture, p2Gesture: LockedGesture): MatchResult {
  const gestures: Record<PlayerId, LockedGesture> = { p1: p1Gesture, p2: p2Gesture };

  if (p1Gesture === "NONE" && p2Gesture === "NONE") {
    return { winner: "draw", gestures };
  }
  if (p1Gesture === "NONE") {
    return { winner: "p2", gestures };
  }
  if (p2Gesture === "NONE") {
    return { winner: "p1", gestures };
  }

  if (p1Gesture === p2Gesture) {
    return { winner: "draw", gestures };
  }

  const p1Wins = BEATS[p1Gesture] === p2Gesture;
  return { winner: p1Wins ? "p1" : "p2", gestures };
}
