import type { LockedGesture, MatchResult } from "@rocklink/shared-types";
import { compareGestures } from "@rocklink/shared-types";

/**
 * Pure game logic — no socket knowledge, no side effects. This is what
 * makes it unit-testable with zero mocking (Blueprint Section 13).
 *
 * Accepts LockedGesture (Gesture | "NONE"), not just Gesture — a locked
 * gesture can be "NONE" when the server's gesture-window deadline
 * force-resolves a player who never submitted (see Room.beginGestureWindow).
 * NONE always loses to a real gesture; NONE vs NONE is a draw.
 *
 * The actual comparison now lives in @rocklink/shared-types (gameEngine.ts)
 * — moved there, not duplicated, so the Player vs AI mode's local match
 * resolution and this server-authoritative path are provably the same
 * algorithm. This class is kept as a thin wrapper so every existing call
 * site (`new GameEngine().compare(...)`) and Room's internals are
 * untouched.
 */
export class GameEngine {
  compare(p1Gesture: LockedGesture, p2Gesture: LockedGesture): MatchResult {
    return compareGestures(p1Gesture, p2Gesture);
  }
}
