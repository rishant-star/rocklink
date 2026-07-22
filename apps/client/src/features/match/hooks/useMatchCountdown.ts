import { useEffect } from "react";
import type { PlayerInfo } from "@rocklink/shared-types";
import { socket } from "@/shared/services/socket/socketClient";
import { useAudioCue } from "@/shared/services/audio/useAudioCue";
import { useMatchStore } from "../store/useMatchStore";

/**
 * Phase 4A scope only: listens for match:countdownTick and feeds it into
 * the existing useMatchStore action. Deliberately does not touch
 * gesture-lock/detecting-phase transitions — that's Phase 4B.
 *
 * Also resets the countdown display if a player disconnects mid-
 * countdown. The server correctly cancels its own timer in this case
 * (Room.cancelCountdown), but without this, the client would be left
 * showing a frozen, unexplained countdown value forever, since no more
 * ticks will ever arrive to update or clear it.
 *
 * Release Candidate 1: also fires the countdown.tick / countdown.go
 * audio cues, subscribed to the same countdownValue store field the
 * visual countdown already reads — not inserted into the socket
 * handler above, per the audio system's "subscribe to existing state"
 * design (see useAudioCue).
 */
export function useMatchCountdown() {
  const handleCountdownTick = useMatchStore((s) => s.handleCountdownTick);
  const reset = useMatchStore((s) => s.reset);
  const countdownValue = useMatchStore((s) => s.countdownValue);

  useAudioCue(countdownValue, "countdown.tick", (value) => value !== null && value > 0);
  useAudioCue(countdownValue, "countdown.go", (value) => value === 0);

  useEffect(() => {
    function handleTick({ value }: { value: number; serverTimestamp: number }) {
      handleCountdownTick(value);
    }
    function handlePlayersUpdated({ players }: { players: PlayerInfo[] }) {
      const currentCountdownValue = useMatchStore.getState().countdownValue;
      const someoneDisconnected = players.some((p) => !p.connected);
      if (currentCountdownValue !== null && someoneDisconnected) {
        reset();
      }
    }
    socket.on("match:countdownTick", handleTick);
    socket.on("room:playersUpdated", handlePlayersUpdated);
    return () => {
      socket.off("match:countdownTick", handleTick);
      socket.off("room:playersUpdated", handlePlayersUpdated);
    };
  }, [handleCountdownTick, reset]);
}
