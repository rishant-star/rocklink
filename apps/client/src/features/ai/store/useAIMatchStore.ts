import { create } from "zustand";
import type { MatchResult, Score } from "@rocklink/shared-types";
import type { BestOf } from "../services/series";
import { isSeriesComplete, scoreRound } from "../services/series";

export type AIMatchPhase = "countdown" | "detecting" | "ai-thinking" | "round-result" | "match-complete";

interface AIMatchState {
  phase: AIMatchPhase;
  countdownValue: number | null;
  /** True once the human player's gesture has been captured for this round. */
  localLocked: boolean;
  /** True only once the AI has finished "thinking" and its move is locked in. */
  aiLocked: boolean;
  result: MatchResult | null;
  score: Score;
  round: number;
  bestOf: BestOf;

  // Actions — mirrors useMatchStore's action shape (Blueprint Section 6)
  // so this store reads the same way, just driven by useAIMatch's local
  // timers instead of socket events.
  handleCountdownTick: (value: number) => void;
  handleDetectingStarted: () => void;
  handleLocalGestureLocked: () => void;
  handleAIThinkingStarted: () => void;
  handleMatchResult: (result: MatchResult, bestOf: BestOf) => void;
  /** Starts the next round: clears phase/locks/result, keeps score — same semantics as useMatchStore.reset() during a multiplayer rematch. */
  startNextRound: () => void;
  /** Full teardown for leaving the match (e.g. "Change Difficulty" / back to Home): also clears score. */
  resetMatch: () => void;
}

const perRoundInitial = {
  phase: "countdown" as AIMatchPhase,
  countdownValue: null as number | null,
  localLocked: false,
  aiLocked: false,
  result: null as MatchResult | null,
};

export const useAIMatchStore = create<AIMatchState>((set) => ({
  ...perRoundInitial,
  score: { p1: 0, p2: 0 },
  round: 1,
  bestOf: 3,

  handleCountdownTick: (value) => set({ phase: "countdown", countdownValue: value }),

  handleDetectingStarted: () => set({ phase: "detecting", countdownValue: null }),

  handleLocalGestureLocked: () => set({ localLocked: true }),

  handleAIThinkingStarted: () => set({ phase: "ai-thinking" }),

  handleMatchResult: (result, bestOf) =>
    set((state) => {
      const score = scoreRound(state.score, result);
      return {
        phase: isSeriesComplete(score, bestOf) ? "match-complete" : "round-result",
        result,
        aiLocked: true,
        score,
        bestOf,
      };
    }),

  startNextRound: () => set((state) => ({ ...perRoundInitial, score: state.score, round: state.round + 1, bestOf: state.bestOf })),

  resetMatch: () => set({ ...perRoundInitial, score: { p1: 0, p2: 0 }, round: 1, bestOf: 3 }),
}));
