import type { LockedGesture, PlayerId } from "@rocklink/shared-types";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Text } from "@/shared/components/Text";
import { CountdownOverlay } from "@/features/match/components/CountdownOverlay";
import { GestureLockIndicator } from "@/features/match/components/GestureLockIndicator";
import { WinnerRevealCard } from "@/features/match/components/WinnerRevealCard";
import { ScoreBoard } from "@/features/match/components/ScoreBoard";
import { GestureCalibrationStage } from "@/features/match/components/GestureCalibrationStage";
import { AIOpponentCard } from "./components/AIOpponentCard";
import { AIRoundControls } from "./components/AIRoundControls";
import { DIFFICULTIES, type AIDifficulty } from "./services/Difficulty";
import { useAIMatch } from "./hooks/useAIMatch";
import type { BestOf } from "./services/series";
import { winsNeeded } from "./services/series";

interface AIMatchProps {
  difficulty: AIDifficulty;
  bestOf: BestOf;
  onChangeDifficulty: () => void;
}

// The human player is always p1 and the AI is always p2 — this lets
// WinnerRevealCard and ScoreBoard (both written against generic
// PlayerId "self vs opponent" props) be reused completely unmodified,
// exactly like Multiplayer uses them.
const SELF_ID: PlayerId = "p1";

/**
 * Player vs AI's match screen. Structurally the same page as
 * Multiplayer's MatchPage — countdown, lock indicator, reveal,
 * scoreboard — with the socket-driven opponent camera swapped for a
 * local AIOpponentCard, and useAIMatch standing in for
 * useMatchCountdown + useGestureLock + useMatchResult combined.
 */
export function AIMatch({ difficulty, bestOf, onChangeDifficulty }: AIMatchProps) {
  const {
    phase,
    countdownValue,
    localLocked,
    aiLocked,
    result,
    score,
    setCurrentGesture,
    playAgain,
    round,
  } = useAIMatch(difficulty, bestOf);

  const difficultyLabel = DIFFICULTIES.find((d) => d.id === difficulty)?.label ?? difficulty;
  const showLockIndicator = phase === "detecting" || phase === "ai-thinking";
  const isFinal = phase === "match-complete";

  // GestureCalibrationStage's callback is typed for LockedGesture (it
  // can carry "NONE" in Multiplayer's server-timeout path). The local
  // classifier itself never actually emits "NONE" — only "UNKNOWN",
  // which CalibrationView already converts to null before calling
  // this — so filtering "NONE" out here is just a type-safe adapter,
  // not new gameplay behavior.
  function handleStableGesture(gesture: LockedGesture | null) {
    setCurrentGesture(gesture && gesture !== "NONE" ? gesture : null);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16">
      <GlassPanel glow="accent" className="w-full max-w-4xl text-center">
        <Text size="caption" tone="muted" className="normal-case tracking-normal">
          Player vs AI · {difficultyLabel} · phase: {phase}
        </Text>
        <CountdownOverlay value={countdownValue} />

        {isFinal && result ? (
          <div className="mt-4 flex flex-col items-center gap-4">
            <WinnerRevealCard result={result} selfId={SELF_ID} />
            <ScoreBoard score={score} selfId={SELF_ID} />
            <AIRoundControls onPlayAgain={playAgain} onChangeDifficulty={onChangeDifficulty} />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2">
              <Text size="caption" tone="muted" className="normal-case tracking-normal">
                Round {round} · Best of {bestOf} · First to {winsNeeded(bestOf)}
              </Text>
              <ScoreBoard score={score} selfId={SELF_ID} />
              {phase === "round-result" && result && <WinnerRevealCard result={result} selfId={SELF_ID} />}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <GestureCalibrationStage onStableGesture={handleStableGesture} resetKey={round} />
              <AIOpponentCard difficulty={difficulty} phase={phase} />
            </div>
            {showLockIndicator && (
              <GestureLockIndicator localLocked={localLocked} opponentLocked={aiLocked} />
            )}
          </div>
        )}
      </GlassPanel>
    </main>
  );
}
