import { randomBytes } from "crypto";
import type {
  LockedGesture,
  MatchResult,
  PlayerId,
  PlayerInfo,
  RoomPhase,
  Score,
} from "@rocklink/shared-types";
import { CountdownAuthority } from "../game/CountdownAuthority.js";
import { GameEngine } from "../game/GameEngine.js";

/**
 * Server-internal player record. Extends the public PlayerInfo shape
 * with a reconnectToken that must NEVER be broadcast to the opponent —
 * it would let them impersonate this player. The `players` getter below
 * is what enforces that: every external read of the roster goes through
 * it, so there's no code path that can accidentally leak a token.
 */
interface InternalPlayer extends PlayerInfo {
  reconnectToken: string;
}

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

const MATCH_IN_PROGRESS_PHASES: RoomPhase[] = ["COUNTDOWN", "AWAITING_GESTURES", "COMPARING"];

/**
 * Single room's state machine. See Blueprint Section 4 for the phase
 * diagram. Milestone 5 added reconnect tokens and grace-period removal.
 * Phase 4A added the countdown as a Room-owned lifecycle detail. Phase
 * 4B adds gesture locks the same way: `locks` is private and never
 * exposed — the only way anything outside this class learns a gesture
 * value is via GameEngine comparison in a later phase, never directly.
 */
export class Room {
  readonly id: string;
  phase: RoomPhase = "WAITING_FOR_PLAYER";
  score: Score = { p1: 0, p2: 0 };
  lastActivityAt: number = Date.now();

  private internalPlayers: InternalPlayer[] = [];
  private disconnectTimers = new Map<PlayerId, NodeJS.Timeout>();
  private readonly countdownAuthority = new CountdownAuthority();
  private readonly gameEngine = new GameEngine();
  private locks = new Map<PlayerId, LockedGesture>();
  private gestureTimeoutTimer?: NodeJS.Timeout;
  private rematchVotes = new Set<PlayerId>();

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Public-safe view. Every existing call site that reads `room.players`
   * continues to work exactly as before — the token stripping happens
   * here once, rather than needing every call site to remember to do it.
   */
  get players(): PlayerInfo[] {
    return this.internalPlayers.map(({ reconnectToken: _reconnectToken, ...rest }) => rest);
  }

  touch(): void {
    this.lastActivityAt = Date.now();
  }

  isEmpty(): boolean {
    return this.internalPlayers.length === 0;
  }

  isExpired(ttlMs: number): boolean {
    return Date.now() - this.lastActivityAt > ttlMs;
  }

  /**
   * Idempotent: a socket already holding a slot gets that same slot
   * (and its existing token) back instead of erroring or double-adding.
   * Returns null only when the room already has two *different* players.
   */
  addPlayer(socketId: string): { player: PlayerInfo; reconnectToken: string } | null {
    const existing = this.internalPlayers.find((p) => p.socketId === socketId);
    if (existing) {
      return { player: this.stripToken(existing), reconnectToken: existing.reconnectToken };
    }
    if (this.internalPlayers.length >= 2) return null;

    const id: PlayerId = this.internalPlayers.length === 0 ? "p1" : "p2";
    this.rematchVotes.delete(id); // Defensive: a previous occupant's stale vote shouldn't apply to whoever takes this slot next.
    const reconnectToken = generateToken();
    const player: InternalPlayer = { id, socketId, connected: true, ready: false, reconnectToken };
    this.internalPlayers.push(player);
    this.touch();
    return { player: this.stripToken(player), reconnectToken };
  }

  /**
   * Rebinds a previously-issued token to a new socket ID — this is what
   * lets a full page refresh (a brand-new socket connection) reclaim the
   * same player slot. Returns null if the token isn't recognized (e.g.
   * already permanently removed, or simply wrong).
   */
  reconnect(reconnectToken: string, newSocketId: string): PlayerInfo | null {
    const player = this.internalPlayers.find((p) => p.reconnectToken === reconnectToken);
    if (!player) return null;

    player.socketId = newSocketId;
    player.connected = true;
    this.cancelPendingRemoval(player.id);
    this.touch();
    return this.stripToken(player);
  }

  /** Marks a player disconnected without removing them (grace period). */
  markDisconnected(socketId: string): PlayerInfo | undefined {
    const player = this.internalPlayers.find((p) => p.socketId === socketId);
    if (!player) return undefined;
    player.connected = false;
    return this.stripToken(player);
  }

  /** Fixes the previously-missing toggleReady bug: room:ready called this and it didn't exist. */
  toggleReady(socketId: string): PlayerInfo | undefined {
    const player = this.internalPlayers.find((p) => p.socketId === socketId);
    if (!player) return undefined;
    player.ready = !player.ready;
    this.touch();
    return this.stripToken(player);
  }

  allPlayersReady(): boolean {
    return this.internalPlayers.length === 2 && this.internalPlayers.every((p) => p.ready);
  }

  /** False while a round is already underway, so a redundant room:ready can't start a second overlapping countdown. */
  canStartMatch(): boolean {
    return this.allPlayersReady() && !MATCH_IN_PROGRESS_PHASES.includes(this.phase);
  }

  /**
   * Starts the room's own CountdownAuthority. Resets both players' ready
   * flags as part of starting the round — "ready" is consumed the
   * moment the countdown begins, not left sitting true through it.
   * `onTick`/`onComplete` are supplied by the caller purely for socket
   * broadcast; the authority instance itself never leaves this class.
   */
  beginCountdown(onTick: (value: number, serverTimestamp: number) => void, onComplete: () => void): void {
    this.phase = "COUNTDOWN";
    for (const p of this.internalPlayers) p.ready = false;
    this.rematchVotes.clear();
    this.touch();
    this.countdownAuthority.start(onTick, () => {
      this.phase = "AWAITING_GESTURES"; // Phase 4B (gesture lock) builds on this
      onComplete();
    });
  }

  cancelCountdown(): void {
    this.countdownAuthority.stop();
  }

  /**
   * Opens the gesture-lock window: clears any stale locks from a
   * previous round and starts the server's own deadline. `onTimeout`
   * fires only if the deadline is actually reached (i.e. not both
   * players locked naturally first) and receives the player IDs that
   * were just force-locked, so the caller can notify their opponents —
   * the same notification the natural-lock path uses, just triggered by
   * the clock instead of a submission.
   */
  beginGestureWindow(timeoutMs: number, onTimeout: (forcedPlayerIds: PlayerId[]) => void): void {
    this.locks.clear();
    this.clearGestureTimeout();
    this.gestureTimeoutTimer = setTimeout(() => {
      const forced = this.forceLockRemaining();
      if (forced.length > 0) onTimeout(forced);
    }, timeoutMs);
  }

  /**
   * Records a player's gesture lock. Idempotent by design: a submission
   * from a player who already has a lock recorded is ignored outright —
   * this is what "ignore any subsequent gesture submissions" means at
   * the data layer, not just a UI-level courtesy. Returns null only if
   * the socket doesn't map to a player in this room.
   */
  lockGesture(
    socketId: string,
    gesture: LockedGesture,
  ): { playerId: PlayerId; alreadyLocked: boolean; bothLocked: boolean } | null {
    const player = this.internalPlayers.find((p) => p.socketId === socketId);
    if (!player) return null;

    if (this.locks.has(player.id)) {
      return {
        playerId: player.id,
        alreadyLocked: true,
        bothLocked: this.locks.size === this.internalPlayers.length,
      };
    }

    this.locks.set(player.id, gesture);
    this.touch();

    const bothLocked = this.locks.size === 2 && this.internalPlayers.length === 2;
    if (bothLocked) {
      this.phase = "COMPARING"; // Bookkeeping only — a later phase does the actual comparison.
      this.clearGestureTimeout(); // Both are in; the deadline no longer applies.
    }

    return { playerId: player.id, alreadyLocked: false, bothLocked };
  }

  /** Forces a deterministic NONE lock for anyone who hasn't submitted by the deadline. Returns which player IDs were just forced. */
  private forceLockRemaining(): PlayerId[] {
    const forced: PlayerId[] = [];
    for (const p of this.internalPlayers) {
      if (!this.locks.has(p.id)) {
        this.locks.set(p.id, "NONE");
        forced.push(p.id);
      }
    }
    if (forced.length > 0) {
      this.phase = "COMPARING";
    }
    return forced;
  }

  /**
   * Compares both locked gestures via GameEngine, updates score, and
   * transitions phase to REVEALED. Idempotency guard: returns null if
   * the round is already REVEALED, so a hypothetical double-call (e.g.
   * a future bug in a caller) can't double-count the score — defense
   * in depth, not reliance on caller discipline alone, matching the
   * same principle applied to CountdownAuthority.start() in Phase 4A.
   * Also returns null if either lock isn't actually present yet, which
   * callers should only invoke this after confirming both are in.
   */
  resolveRound(): MatchResult | null {
    if (this.phase === "REVEALED") return null;
    if (this.internalPlayers.length !== 2) return null;

    const p1Gesture = this.locks.get("p1");
    const p2Gesture = this.locks.get("p2");
    if (p1Gesture === undefined || p2Gesture === undefined) return null;

    const result = this.gameEngine.compare(p1Gesture, p2Gesture);
    if (result.winner === "p1") this.score.p1 += 1;
    if (result.winner === "p2") this.score.p2 += 1;
    this.phase = "REVEALED";
    this.touch();
    return result;
  }

  private clearGestureTimeout(): void {
    if (this.gestureTimeoutTimer) {
      clearTimeout(this.gestureTimeoutTimer);
      this.gestureTimeoutTimer = undefined;
    }
  }

  /**
   * Records a rematch vote. Only honored once a round has actually
   * completed (REVEALED) or a rematch is already being negotiated
   * (REMATCH_PENDING) — a stray vote mid-round is ignored outright,
   * same discipline as an invalid gesture submission. No timeout here
   * by design (approved): the server waits indefinitely for both votes
   * or for a player to leave, which the existing disconnect/removal
   * path already handles by clearing votes (see scheduleRemoval).
   */
  requestRematch(socketId: string): { playerId: PlayerId; bothAgreed: boolean } | null {
    if (this.phase !== "REVEALED" && this.phase !== "REMATCH_PENDING") return null;
    const player = this.internalPlayers.find((p) => p.socketId === socketId);
    if (!player) return null;

    this.rematchVotes.add(player.id);
    this.phase = "REMATCH_PENDING";
    this.touch();

    const bothAgreed = this.internalPlayers.length === 2 && this.rematchVotes.size === 2;
    return { playerId: player.id, bothAgreed };
  }

  /**
   * Schedules permanent removal after `delayMs` unless cancelled first
   * (by a successful `reconnect` for this player). `onExpire` fires only
   * if removal actually happens, so the caller can broadcast
   * room:playerLeft / clean up an emptied room.
   */
  scheduleRemoval(playerId: PlayerId, delayMs: number, onExpire: () => void): void {
    this.cancelPendingRemoval(playerId);
    const timer = setTimeout(() => {
      const wasHost = playerId === "p1";
      this.internalPlayers = this.internalPlayers.filter((p) => p.id !== playerId);
      this.disconnectTimers.delete(playerId);
      this.rematchVotes.clear(); // A departure fully resets rematch agreement, not just this player's vote.
      if (wasHost) this.promoteHostIfNeeded();
      onExpire();
    }, delayMs);
    this.disconnectTimers.set(playerId, timer);
  }

  cancelPendingRemoval(playerId: PlayerId): void {
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }
  }

  /** Clears all pending timers — called when the room itself is deleted. */
  dispose(): void {
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    this.countdownAuthority.stop();
    this.clearGestureTimeout();
  }

  /** If the host slot is now empty but a guest remains, promote them to host. */
  private promoteHostIfNeeded(): void {
    if (this.internalPlayers.length === 1 && this.internalPlayers[0].id !== "p1") {
      this.internalPlayers[0].id = "p1";
    }
  }

  private stripToken(player: InternalPlayer): PlayerInfo {
    const { reconnectToken: _reconnectToken, ...rest } = player;
    return rest;
  }
}
