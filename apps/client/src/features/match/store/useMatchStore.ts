import { create } from "zustand";
import type { Gesture, MatchPhase, MatchResult, PlayerId, Score } from "@rocklink/shared-types";

interface MatchState {
  phase: MatchPhase;
  countdownValue: number | null;
  localGesture: Gesture | null;
  localLocked: boolean;
  opponentLocked: boolean;
  result: MatchResult | null;
  score: Score;
  /**
   * True once the server confirms the opponent has permanently left
   * (the `room:playerLeft` event, fired only after their reconnect
   * grace period actually expires — not on a transient disconnect,
   * which useMatchCountdown already handles separately via reset()).
   * Distinct from a mid-countdown disconnect specifically because that
   * case is still recoverable; this one isn't.
   */
  opponentLeft: boolean;
  /**
   * Which PlayerId (p1/p2) this client is. Set once by useLobbySocket,
   * which already derives this from the roster (players.find(p =>
   * p.socketId === socket.id)) — persisted here specifically so the
   * Match page can read it after Lobby unmounts, without needing a
   * protocol change to match:result. See Phase 4C notes.
   */
  selfId: PlayerId | null;

  // Actions — called directly from socket handlers. Kept pure enough to
  // unit test without mocking React. See Blueprint Section 6.
  handleCountdownTick: (value: number) => void;
  handleDetectingStarted: () => void;
  handleLocalGestureLocked: (gesture: Gesture) => void;
  handleOpponentLocked: () => void;
  handleMatchResult: (result: MatchResult, score: Score) => void;
  setSelfId: (id: PlayerId) => void;
  /**
   * The opponent permanently left the match (see `opponentLeft` above).
   * Previously a documented no-op pending real room/match socket
   * handlers, which now exist — wired from useRematch's existing
   * room:playerLeft listener (see that hook) rather than a new one, to
   * avoid a second subscription to the same event.
   */
  handlePlayerLeft: () => void;
  reset: () => void;
}

const initialState = {
  phase: "lobby" as MatchPhase,
  countdownValue: null,
  localGesture: null,
  localLocked: false,
  opponentLocked: false,
  result: null,
  score: { p1: 0, p2: 0 },
  selfId: null,
  opponentLeft: false,
};

export const useMatchStore = create<MatchState>((set) => ({
  ...initialState,

  handleCountdownTick: (value) =>
    set({ phase: "countdown", countdownValue: value }),

  handleDetectingStarted: () =>
    set({ phase: "detecting", countdownValue: null }),

  handleLocalGestureLocked: (gesture) =>
    set({ localGesture: gesture, localLocked: true }),

  handleOpponentLocked: () => set({ opponentLocked: true }),

  handleMatchResult: (result, score) =>
    set({ phase: "revealed", result, score }),

  setSelfId: (id) => set({ selfId: id }),

  handlePlayerLeft: () => set({ opponentLeft: true }),

  // selfId and score are deliberately NOT cleared here — both are
  // stable identity/progress for the current match (which player you
  // are, and the running score), not per-round transient state like a
  // countdown or a single lock.
  reset: () =>
    set({
      phase: "lobby",
      countdownValue: null,
      localGesture: null,
      localLocked: false,
      opponentLocked: false,
      result: null,
    }),
}));
