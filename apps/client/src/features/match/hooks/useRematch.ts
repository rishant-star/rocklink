import { useCallback, useEffect, useState } from "react";
import { socket } from "@/shared/services/socket/socketClient";
import { AudioManager } from "@/shared/services/audio/AudioManager";
import { useMatchStore } from "../store/useMatchStore";

/**
 * Phase 5: no timeout of its own (approved design) — the server waits
 * indefinitely for both votes or a player leaving, so this hook simply
 * reflects whatever the server reports rather than racing its own
 * clock. Local hook state (not Zustand) for the same reason
 * useLobbySocket keeps self/opponent local: this is page-scoped,
 * transient UI state, not a cross-cutting concern.
 *
 * Release Candidate 1: fires the rematch.accepted audio cue directly
 * from handleAccepted below, since it's already a real, one-shot server
 * event handler — not a derived value useAudioCue's value/threshold
 * shape would fit any more naturally.
 */
export function useRematch() {
  const selfId = useMatchStore((s) => s.selfId);
  const reset = useMatchStore((s) => s.reset);
  const handlePlayerLeftInStore = useMatchStore((s) => s.handlePlayerLeft);
  const [selfRequested, setSelfRequested] = useState(false);
  const [opponentRequested, setOpponentRequested] = useState(false);

  const requestRematch = useCallback(() => {
    setSelfRequested(true);
    socket.emit("match:rematchRequest");
  }, []);

  useEffect(() => {
    function handlePending({ requestedBy }: { requestedBy: string }) {
      if (requestedBy === selfId) {
        setSelfRequested(true);
      } else {
        setOpponentRequested(true);
      }
    }
    function handleAccepted() {
      setSelfRequested(false);
      setOpponentRequested(false);
      AudioManager.play("rematch.accepted");
      // Clears phase/result/locks (not score, not selfId — reset()
      // already preserves both) so the fresh countdown that follows
      // takes over from a clean slate, exactly like the first round.
      reset();
    }
    function handlePlayerLeft() {
      // The opponent permanently leaving invalidates any pending
      // negotiation — without this, a player left on "Waiting for
      // opponent…" would be stuck there forever, since the server has
      // already cleared its own votes (Room.scheduleRemoval) but
      // nothing told this client. Uses the existing room:playerLeft
      // event, which already fires for this — no new event needed.
      setSelfRequested(false);
      setOpponentRequested(false);
      // Also flips the store's opponentLeft flag so MatchPage can show
      // an actual "your opponent left" banner instead of silently
      // leaving the player stranded — see useMatchStore's doc comment.
      handlePlayerLeftInStore();
    }
    socket.on("match:rematchPending", handlePending);
    socket.on("match:rematchAccepted", handleAccepted);
    socket.on("room:playerLeft", handlePlayerLeft);
    return () => {
      socket.off("match:rematchPending", handlePending);
      socket.off("match:rematchAccepted", handleAccepted);
      socket.off("room:playerLeft", handlePlayerLeft);
    };
  }, [selfId, reset, handlePlayerLeftInStore]);

  return { requestRematch, selfRequested, opponentRequested };
}
