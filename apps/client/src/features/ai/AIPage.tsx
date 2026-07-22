import { useState } from "react";
import { AISetup } from "./AISetup";
import { AIMatch } from "./AIMatch";
import { useAIMatchStore } from "./store/useAIMatchStore";
import type { AIDifficulty } from "./services/Difficulty";
import type { BestOf } from "./services/series";

/**
 * Player vs AI's top-level route. Difficulty selection and the match
 * itself are both instant, local transitions — no server round-trip,
 * no route change (see the Player vs AI spec's "No server required" /
 * "No Socket.IO required"), so this is intentionally one route with
 * internal state rather than two nested routes.
 */
export function AIPage() {
  const [difficulty, setDifficulty] = useState<AIDifficulty | null>(null);
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const resetMatch = useAIMatchStore((s) => s.resetMatch);

  function handleStart(selected: AIDifficulty, selectedBestOf: BestOf) {
    resetMatch(); // Defensive: guarantees a clean phase/score even if a previous match's store state somehow lingered.
    setDifficulty(selected);
    setBestOf(selectedBestOf);
  }

  function handleChangeDifficulty() {
    resetMatch();
    setDifficulty(null);
  }

  if (!difficulty) {
    return <AISetup onStart={handleStart} />;
  }

  return <AIMatch difficulty={difficulty} bestOf={bestOf} onChangeDifficulty={handleChangeDifficulty} />;
}
