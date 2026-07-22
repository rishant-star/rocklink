import { useEffect, useRef, useState } from "react";
import type { Gesture, LockedGesture } from "@rocklink/shared-types";
import { compareGestures } from "@rocklink/shared-types";
import { useAudioCue } from "@/shared/services/audio/useAudioCue";
import { useAIMatchStore } from "../store/useAIMatchStore";
import { chooseAIMove } from "../services/AIEngine";
import { AdaptiveStrategy } from "../services/AdaptiveStrategy";
import type { AIDifficulty } from "../services/Difficulty";
import type { BestOf } from "../services/series";

// Mirrors apps/server/src/config/index.ts's countdown config exactly
// (startValue 3, tickIntervalMs 1000) so the AI mode's countdown feels
// identical to Multiplayer's, without importing server-only code into
// the client bundle.
const COUNTDOWN_START = 3;
const COUNTDOWN_TICK_MS = 1000;

// Player vs AI spec: "Wait between 300–800ms" before the AI locks in,
// so the opponent never feels instant/robotic.
const AI_THINK_MIN_MS = 300;
const AI_THINK_MAX_MS = 800;
const ROUND_RESULT_MS = 1800;

function randomThinkDelay(): number {
  return AI_THINK_MIN_MS + Math.random() * (AI_THINK_MAX_MS - AI_THINK_MIN_MS);
}

/**
 * Owns the full Player vs AI round lifecycle entirely client-side — no
 * socket, no server. Deliberately mirrors the shape of the existing
 * useMatchCountdown / useGestureLock / useMatchResult trio (same
 * countdown cadence, same "submit exactly once" discipline, same audio
 * cue wiring) so this reads as the same architecture applied locally,
 * not a different design bolted on.
 */
export function useAIMatch(difficulty: AIDifficulty, bestOf: BestOf) {
  const phase = useAIMatchStore((s) => s.phase);
  const countdownValue = useAIMatchStore((s) => s.countdownValue);
  const localLocked = useAIMatchStore((s) => s.localLocked);
  const aiLocked = useAIMatchStore((s) => s.aiLocked);
  const result = useAIMatchStore((s) => s.result);
  const score = useAIMatchStore((s) => s.score);
  const round = useAIMatchStore((s) => s.round);
  const handleCountdownTick = useAIMatchStore((s) => s.handleCountdownTick);
  const handleDetectingStarted = useAIMatchStore((s) => s.handleDetectingStarted);
  const handleLocalGestureLocked = useAIMatchStore((s) => s.handleLocalGestureLocked);
  const handleAIThinkingStarted = useAIMatchStore((s) => s.handleAIThinkingStarted);
  const handleMatchResult = useAIMatchStore((s) => s.handleMatchResult);
  const startNextRound = useAIMatchStore((s) => s.startNextRound);
  const resetMatch = useAIMatchStore((s) => s.resetMatch);

  const [currentGesture, setCurrentGesture] = useState<Gesture | null>(null);
  const [aiGesture, setAiGesture] = useState<Gesture | null>(null);

  // Per-match, not per-render: created once and reused across every
  // round of this match so ADAPTIVE actually accumulates history.
  const adaptiveStrategyRef = useRef<AdaptiveStrategy>();
  if (!adaptiveStrategyRef.current) {
    adaptiveStrategyRef.current = new AdaptiveStrategy();
  }
  const lastPlayerMoveRef = useRef<Gesture | null>(null);
  const hasSubmittedRef = useRef(false);
  // The gesture actually locked in, captured once at lock time. The AI
  // must resolve against this — not against `currentGesture`, which
  // keeps updating live from the camera for as long as
  // GestureCalibrationStage stays mounted, including all the way
  // through the ai-thinking window.
  const lockedGestureRef = useRef<Gesture | null>(null);
  // Bumped once per round (on lock, and defensively on playAgain/
  // endMatch). A timer callback only resolves if the generation it was
  // scheduled under still matches — protection against a stale timer
  // from a previous round ever resolving a new one.
  const roundGenerationRef = useRef(0);
  // Belt-and-suspenders alongside the generation check: once a round
  // has been resolved, nothing (including the failsafe below) can
  // resolve it again.
  const resolvedRef = useRef(false);

  useAudioCue(countdownValue, "countdown.tick", (v) => v !== null && v > 0);
  useAudioCue(countdownValue, "countdown.go", (v) => v === 0);
  useAudioCue(localLocked, "ui.lock", (v) => v === true);
  useAudioCue(result, "match.win", (r) => r !== null && r.winner === "p1");
  useAudioCue(result, "match.lose", (r) => r !== null && r.winner !== "draw" && r.winner !== "p1");
  useAudioCue(result, "match.draw", (r) => r !== null && r.winner === "draw");

  // Local countdown ticker — same tick cadence and "GO at 0" semantics
  // as the server's CountdownAuthority, just driven by setInterval
  // instead of a socket broadcast. Runs fresh every time phase becomes
  // "countdown" (first round, and every rematch after).
  useEffect(() => {
    if (phase !== "countdown") return undefined;

    let value = COUNTDOWN_START;
    const interval = setInterval(() => {
      handleCountdownTick(value);
      if (value === 0) {
        clearInterval(interval);
        return;
      }
      value -= 1;
    }, COUNTDOWN_TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // GO (countdownValue reaches 0) hands off to the detecting phase —
  // identical transition to useGestureLock's multiplayer equivalent.
  useEffect(() => {
    if (countdownValue === 0 && phase === "countdown") {
      handleDetectingStarted();
    }
  }, [countdownValue, phase, handleDetectingStarted]);

  // Submit the player's first stable gesture exactly once per round.
  // Deliberately does NOT own the AI timer (see the effect below) —
  // this effect's own side effects (handleLocalGestureLocked,
  // handleAIThinkingStarted) change `localLocked` and `phase`, which
  // are both in its own dependency array. That's fine here, since this
  // effect has no cleanup to lose: React tearing it down and
  // re-running it (the top guard then exits immediately because phase
  // is no longer "detecting") is a harmless no-op. It was NOT fine
  // when this same effect also held the AI's setTimeout — see below.
  useEffect(() => {
    if (phase !== "detecting") {
      hasSubmittedRef.current = false;
      return undefined;
    }
    if (hasSubmittedRef.current || localLocked) return undefined;
    if (!currentGesture) return undefined;

    hasSubmittedRef.current = true;
    lockedGestureRef.current = currentGesture;
    resolvedRef.current = false;
    roundGenerationRef.current += 1;
    handleLocalGestureLocked();
    handleAIThinkingStarted();
  }, [phase, currentGesture, localLocked, handleLocalGestureLocked, handleAIThinkingStarted]);

  // Owns the AI's "thinking" timer. Deliberately depends on ONLY phase
  // and difficulty — not localLocked, not aiLocked, not currentGesture.
  //
  // This is the fix for the actual bug: the previous version combined
  // this timer with the lock-submission effect above, and included
  // localLocked in that effect's dependency array. Locking the human's
  // gesture set localLocked to true as a direct side effect of the
  // same effect that scheduled the timer — which changed the effect's
  // own dependencies, which tore the effect down (clearing the
  // just-scheduled timeout) and re-ran it before the 300–800ms delay
  // ever elapsed. The re-run's top guard (`phase !== "detecting"`)
  // then exited immediately, since phase was already "ai-thinking" —
  // silently abandoning the timer forever, every single round. Keeping
  // this effect's dependency array free of anything it (or the effect
  // above) sets as part of entering ai-thinking is what prevents that
  // self-cancellation from happening again.
  useEffect(() => {
    if (phase !== "ai-thinking") return undefined;

    const generation = roundGenerationRef.current;
    const playerMove = lockedGestureRef.current;
    if (!playerMove) return undefined; // Defensive — the effect above always sets this before transitioning to ai-thinking.

    function resolve() {
      if (resolvedRef.current || generation !== roundGenerationRef.current) return;
      resolvedRef.current = true;

      const move = chooseAIMove({
        difficulty,
        playerLastMove: lastPlayerMoveRef.current,
        adaptiveStrategy: adaptiveStrategyRef.current!,
      });

      adaptiveStrategyRef.current!.record(playerMove!);
      lastPlayerMoveRef.current = playerMove;
      setAiGesture(move);

      const outcome = compareGestures(playerMove as LockedGesture, move as LockedGesture);
      handleMatchResult(outcome, bestOf);
    }

    const timeout = setTimeout(resolve, randomThinkDelay());
    // Failsafe: if the primary timer somehow never fires, force
    // resolution well past the documented 300–800ms window rather than
    // leaving the match stuck in ai-thinking forever. Routed through
    // the exact same resolve() — same generation/resolvedRef guards —
    // so it can never double-resolve alongside the primary timer; it
    // only ever does anything if the primary timer didn't.
    const failsafe = setTimeout(resolve, 2500);

    return () => {
      clearTimeout(timeout);
      clearTimeout(failsafe);
    };
  }, [phase, difficulty, bestOf, handleMatchResult]);

  // A completed non-final round is shown briefly, then moves to a clean
  // next round. The generation token ensures Play Again/Change Difficulty
  // invalidate this timer before it can mutate a fresh match.
  useEffect(() => {
    if (phase !== "round-result") return undefined;
    const generation = roundGenerationRef.current;
    const timeout = setTimeout(() => {
      if (generation !== roundGenerationRef.current) return;
      setCurrentGesture(null);
      setAiGesture(null);
      lockedGestureRef.current = null;
      startNextRound();
    }, ROUND_RESULT_MS);
    return () => clearTimeout(timeout);
  }, [phase, startNextRound]);

  function playAgain() {
    setCurrentGesture(null);
    setAiGesture(null);
    lockedGestureRef.current = null;
    resolvedRef.current = false;
    roundGenerationRef.current += 1;
    startNextRound();
  }

  function endMatch() {
    setCurrentGesture(null);
    setAiGesture(null);
    lockedGestureRef.current = null;
    resolvedRef.current = false;
    roundGenerationRef.current += 1;
    adaptiveStrategyRef.current = new AdaptiveStrategy();
    lastPlayerMoveRef.current = null;
    resetMatch();
  }

  return {
    phase,
    countdownValue,
    localLocked,
    aiLocked,
    result,
    score,
    round,
    aiGesture,
    setCurrentGesture,
    playAgain,
    endMatch,
  };
}
