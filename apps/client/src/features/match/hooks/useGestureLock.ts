import { useEffect, useRef } from "react";
import type { Gesture } from "@rocklink/shared-types";
import { socket } from "@/shared/services/socket/socketClient";
import { useAudioCue } from "@/shared/services/audio/useAudioCue";
import { useMatchStore } from "../store/useMatchStore";

/**
 * Phase 4B: wires the local gesture pipeline (Milestone 6) to the
 * server-authoritative lock protocol. Deliberately has no timeout of
 * its own — if this client never detects a stable gesture, it simply
 * never emits, and the server's own deadline (Room.beginGestureWindow)
 * is what resolves the round. Two independent timeouts would be
 * redundant and could disagree; one source of truth is simpler and
 * matches "server-authoritative" in spirit, not just in name.
 *
 * Release Candidate 1: also fires the ui.lock audio cue when the local
 * player's own gesture locks in, subscribed to the existing
 * `localLocked` state rather than inserted into the emit path above.
 */
export function useGestureLock(currentGesture: Gesture | null) {
  const phase = useMatchStore((s) => s.phase);
  const countdownValue = useMatchStore((s) => s.countdownValue);
  const handleDetectingStarted = useMatchStore((s) => s.handleDetectingStarted);
  const handleLocalGestureLocked = useMatchStore((s) => s.handleLocalGestureLocked);
  const handleOpponentLocked = useMatchStore((s) => s.handleOpponentLocked);
  const localLocked = useMatchStore((s) => s.localLocked);

  useAudioCue(localLocked, "ui.lock", (locked) => locked === true);

  // GO (countdownValue reaches 0) transitions local phase to
  // "detecting" — previously nothing called this existing action.
  useEffect(() => {
    if (countdownValue === 0 && phase === "countdown") {
      handleDetectingStarted();
    }
  }, [countdownValue, phase, handleDetectingStarted]);

  // Submit the first stable gesture read during "detecting", exactly
  // once. A ref (not just the `localLocked` state check) guards against
  // submitting twice within the same render pass before state updates.
  const hasSubmittedRef = useRef(false);
  useEffect(() => {
    if (phase !== "detecting") {
      hasSubmittedRef.current = false;
      return;
    }
    if (hasSubmittedRef.current || localLocked) return;
    if (!currentGesture) return;

    hasSubmittedRef.current = true;
    handleLocalGestureLocked(currentGesture);
    socket.emit("match:gestureLock", { gesture: currentGesture });
  }, [phase, currentGesture, localLocked, handleLocalGestureLocked]);

  useEffect(() => {
    function handleOpponentLockedEvent() {
      handleOpponentLocked();
    }
    socket.on("match:opponentLocked", handleOpponentLockedEvent);
    return () => {
      socket.off("match:opponentLocked", handleOpponentLockedEvent);
    };
  }, [handleOpponentLocked]);
}
