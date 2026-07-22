import type { Gesture, MatchResult, PlayerInfo } from "./game.js";

/**
 * Client -> Server events.
 * Naming convention: imperative verbs (this is a request).
 */
export interface ClientToServerEvents {
  "room:create": () => void;
  "room:join": (payload: { roomId: string; reconnectToken?: string }) => void;
  "room:ready": () => void;
  "match:gestureLock": (payload: { gesture: Gesture }) => void;
  "match:rematchRequest": () => void;
}

/**
 * Server -> Client events.
 * Naming convention: past tense (this is a confirmed fact).
 *
 * NOTE: `match:opponentLocked` intentionally carries no gesture payload.
 * Gestures are withheld server-side until both players have locked, then
 * released together via `match:result`. See Blueprint Section 5.
 */
export interface ServerToClientEvents {
  "room:created": (payload: { roomId: string }) => void;
  "room:joined": (payload: { roomId: string; players: PlayerInfo[]; reconnectToken: string }) => void;
  "room:playerJoined": (payload: { player: PlayerInfo }) => void;
  "room:playersUpdated": (payload: { players: PlayerInfo[] }) => void;
  "room:full": (payload: { reason: string }) => void;
  "room:notFound": (payload: { reason: string }) => void;
  "room:playerLeft": () => void;
  "match:bothReady": () => void;
  "match:countdownTick": (payload: { value: number; serverTimestamp: number }) => void;
  "match:opponentLocked": () => void;
  "match:result": (payload: MatchResult & { score: { p1: number; p2: number } }) => void;
  "match:rematchPending": (payload: { requestedBy: string }) => void;
  "match:rematchAccepted": () => void;
  "error:generic": (payload: { code: string; message: string }) => void;
}
