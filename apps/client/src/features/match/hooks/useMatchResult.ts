import { useEffect } from "react";
import type { MatchResult, Score } from "@rocklink/shared-types";
import { socket } from "@/shared/services/socket/socketClient";
import { useAudioCue } from "@/shared/services/audio/useAudioCue";
import { useMatchStore } from "../store/useMatchStore";

/**
 * Phase 4C: listens for the single synchronized match:result broadcast
 * and forwards it into the existing handleMatchResult action (defined
 * since Milestone 3, unused until now). No selfId in this payload —
 * see Phase 4C's architecture notes for why that's not needed here.
 *
 * Release Candidate 1: also fires exactly one of match.win / match.lose
 * / match.draw once `result` and `selfId` are both available, each as
 * its own useAudioCue subscription to the existing store fields rather
 * than a play() call inserted into handleResult above.
 */
export function useMatchResult() {
  const handleMatchResult = useMatchStore((s) => s.handleMatchResult);
  const result = useMatchStore((s) => s.result);
  const selfId = useMatchStore((s) => s.selfId);

  useAudioCue(result, "match.win", (r) => r !== null && selfId !== null && r.winner === selfId);
  useAudioCue(
    result,
    "match.lose",
    (r) => r !== null && selfId !== null && r.winner !== "draw" && r.winner !== selfId,
  );
  useAudioCue(result, "match.draw", (r) => r !== null && r.winner === "draw");

  useEffect(() => {
    function handleResult(payload: MatchResult & { score: Score }) {
      const { winner, gestures, score } = payload;
      handleMatchResult({ winner, gestures }, score);
    }
    socket.on("match:result", handleResult);
    return () => {
      socket.off("match:result", handleResult);
    };
  }, [handleMatchResult]);
}
