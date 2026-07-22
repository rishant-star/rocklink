/**
 * Core game vocabulary shared between client and server.
 * Keeping this in one place prevents client/server drift on what a
 * "gesture" or "winner" value can be.
 */

export type Gesture = "ROCK" | "PAPER" | "SCISSORS";

/**
 * What a player actually submits to the server when locking in. Distinct
 * from the classifier's "UNKNOWN" (a live, transient "no clear pose yet"
 * reading) — NONE is a deliberate, terminal forfeit signal: either the
 * player never produced a stable gesture within the lock window, or
 * (server-side) they never submitted at all before the stall timeout.
 * Keeping it out of `Gesture` itself means GameEngine's win-cycle logic
 * (BEATS) never has to reason about a "gesture" that isn't an actual
 * hand pose.
 */
export type LockedGesture = Gesture | "NONE";

export type PlayerId = "p1" | "p2";

export type MatchWinner = PlayerId | "draw";

export interface PlayerInfo {
  id: PlayerId;
  socketId: string;
  connected: boolean;
  ready: boolean;
}

export interface MatchResult {
  winner: MatchWinner;
  gestures: Record<PlayerId, LockedGesture>;
}

export interface Score {
  p1: number;
  p2: number;
}

export type MatchPhase =
  | "lobby"
  | "countdown"
  | "detecting"
  | "locked"
  | "revealed"
  | "rematch-pending";

export type RoomPhase =
  | "WAITING_FOR_PLAYER"
  | "BOTH_CONNECTED"
  | "READY_CHECK"
  | "COUNTDOWN"
  | "AWAITING_GESTURES"
  | "COMPARING"
  | "REVEALED"
  | "REMATCH_PENDING";
