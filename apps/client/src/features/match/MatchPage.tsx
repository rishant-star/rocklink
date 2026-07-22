import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import type { Gesture, LockedGesture } from "@rocklink/shared-types";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { ErrorState } from "@/shared/components/ErrorState";
import { useMatchStore } from "./store/useMatchStore";
import { useLobbySocket } from "@/features/lobby/hooks/useLobbySocket";
import { GestureCalibrationStage } from "./components/GestureCalibrationStage";
import { CountdownOverlay } from "./components/CountdownOverlay";
import { GestureLockIndicator } from "./components/GestureLockIndicator";
import { WinnerRevealCard } from "./components/WinnerRevealCard";
import { ScoreBoard } from "./components/ScoreBoard";
import { RematchPanel } from "./components/RematchPanel";
import { useMatchCountdown } from "./hooks/useMatchCountdown";
import { useGestureLock } from "./hooks/useGestureLock";
import { useMatchResult } from "./hooks/useMatchResult";
import { useRematch } from "./hooks/useRematch";

/**
 * Milestone 6 added the local camera/gesture calibration pipeline.
 * Phase 4A added the synchronized countdown. Phase 4B added gesture
 * locking. Phase 4C completed round resolution. Phase 5 adds rematch:
 * once both players agree (via RematchPanel), the server restarts the
 * round through the exact same countdown/gesture pipeline already in
 * use — reset() clears the previous round's result/locks so the fresh
 * countdown takes over from a clean slate.
 *
 * Same roomId-guard shape as LobbyPage, for the same reason: useParams
 * can't statically guarantee roomId is present, and every hook below
 * needs it as a real string, not string | undefined.
 */
export function MatchPage() {
  const { roomId } = useParams();
  if (!roomId) {
    return <Navigate to="/" replace />;
  }
  return <MatchContent roomId={roomId} />;
}

function MatchContent({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const phase = useMatchStore((s) => s.phase);
  const countdownValue = useMatchStore((s) => s.countdownValue);
  const localLocked = useMatchStore((s) => s.localLocked);
  const opponentLocked = useMatchStore((s) => s.opponentLocked);
  const result = useMatchStore((s) => s.result);
  const score = useMatchStore((s) => s.score);
  const selfId = useMatchStore((s) => s.selfId);
  const opponentLeft = useMatchStore((s) => s.opponentLeft);

  // Ensures this socket is actually joined to the room and selfId is
  // populated even when MatchPage is the very first thing to mount on
  // this socket — e.g. a full page refresh while already in a match.
  // Without this, only LobbyPage ever presented the stored
  // reconnectToken, so refreshing mid-match (rather than mid-lobby)
  // permanently orphaned the refreshing player: new socket, never
  // rejoined, no more countdown/lock/result events, ever. Reuses
  // useLobbySocket as-is rather than duplicating its rejoin logic —
  // Room.reconnect/addPlayer are both already idempotent, so this is a
  // harmless no-op on the normal Lobby-to-Match transition where no
  // disconnect actually happened.
  useLobbySocket(roomId);

  useMatchCountdown();
  useMatchResult();
  const { requestRematch, selfRequested, opponentRequested } = useRematch();

  const [currentGesture, setCurrentGesture] = useState<Gesture | null>(null);
  useGestureLock(currentGesture);

  // GestureCalibrationStage's callback is typed for LockedGesture (it
  // can carry "NONE" for a future/expanded use); the local classifier
  // itself only ever emits a real Gesture or null here, so narrowing
  // it before handing off to useGestureLock (which only accepts
  // Gesture | null) is a type-safe adapter, not new behavior.
  function handleStableGesture(gesture: LockedGesture | null) {
    setCurrentGesture(gesture && gesture !== "NONE" ? gesture : null);
  }

  const showLockIndicator = phase === "detecting" || phase === "locked";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16">
      <GlassPanel glow="accent" className="w-full max-w-2xl text-center">
        <p className="text-caption uppercase tracking-wide text-text-muted">
          Room {roomId} · phase: {phase}
        </p>
        {opponentLeft && (
          <div className="mt-4">
            <ErrorState
              variant="inline"
              message="Your opponent left the match."
              actionLabel="Back to Home"
              onAction={() => navigate("/")}
            />
          </div>
        )}
        <CountdownOverlay value={countdownValue} />
        {showLockIndicator && (
          <div className="mt-4">
            <GestureLockIndicator localLocked={localLocked} opponentLocked={opponentLocked} />
          </div>
        )}
        {phase === "revealed" && result && selfId ? (
          <div className="mt-4 flex flex-col items-center gap-4">
            <WinnerRevealCard result={result} selfId={selfId} />
            <ScoreBoard score={score} selfId={selfId} />
            <RematchPanel
              selfRequested={selfRequested}
              opponentRequested={opponentRequested}
              onRequestRematch={requestRematch}
            />
          </div>
        ) : (
          <div className="mt-4">
            <GestureCalibrationStage onStableGesture={handleStableGesture} />
          </div>
        )}
      </GlassPanel>
    </main>
  );
}
