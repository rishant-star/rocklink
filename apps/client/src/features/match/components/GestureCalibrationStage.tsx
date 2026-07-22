import { useEffect, useRef, useState } from "react";
import type { LockedGesture } from "@rocklink/shared-types";
import type { FrameDiagnostics, HandLandmarks } from "@/features/gesture-detection/types";
import { CameraPermissionGate } from "@/features/camera/components/CameraPermissionGate";
import { CameraPreview } from "@/features/camera/components/CameraPreview";
import { ErrorState } from "@/shared/components/ErrorState";
import {
  LandmarkOverlay,
  type LandmarkOverlayHandle,
} from "@/features/gesture-detection/components/LandmarkOverlay";
import { GestureReadout } from "@/features/gesture-detection/components/GestureReadout";
import { useGestureDetector } from "@/features/gesture-detection/hooks/useGestureDetector";

interface GestureCalibrationStageProps {
  /**
   * Surfaces the stabilized gesture upward (e.g. for Phase 4B's lock
   * hook) without lifting this component's internal state or otherwise
   * restructuring it — mirrors the existing onFrameLandmarks callback
   * pattern already used for the same underlying hook.
   */
  onStableGesture?: (gesture: LockedGesture | null) => void;
  resetKey?: number;
}

/**
 * Live local pipeline: camera → landmarks → classification → readout.
 * Deliberately has no countdown, lock, or round logic itself — that
 * lives in useGestureLock, which consumes this via onStableGesture.
 */
function CalibrationView({
  stream,
  onStableGesture,
  resetKey,
}: {
  stream: MediaStream;
  onStableGesture?: (gesture: LockedGesture | null) => void;
  resetKey?: number;
}) {
  // A callback ref surfaced as state (not a plain ref) is required here:
  // useGestureDetector's effect needs to re-run once the <video> element
  // actually exists, and a plain ref mutation wouldn't trigger that.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const overlayRef = useRef<LandmarkOverlayHandle>(null);

  // onFrameLandmarks and onFrameDiagnostics both fire once per frame,
  // in that order, from the same synchronous pipeline tick — this ref
  // just bridges the two into a single draw() call rather than lifting
  // per-frame data into React state.
  const latestLandmarksRef = useRef<HandLandmarks | null>(null);

  // Hand-presence, unlike per-frame landmarks, changes rarely (only at
  // real appear/disappear transitions), so it's safe as normal React
  // state — needed to tell SCANNING (no hand) apart from TRACKING (hand
  // visible, gesture not yet stable), which `gesture` alone can't do.
  const [hasHand, setHasHand] = useState(false);
  const requireNeutralRef = useRef(false);
  const onStableGestureRef = useRef(onStableGesture);
  onStableGestureRef.current = onStableGesture;

  useEffect(() => {
    requireNeutralRef.current = true;
    onStableGestureRef.current?.(null);
  }, [resetKey]);

  const { gesture, confidence, error } = useGestureDetector({
    videoElement: videoEl,
    active: true,
    onFrameLandmarks: (landmarks) => {
      latestLandmarksRef.current = landmarks;
      setHasHand((prev) => (prev === (landmarks !== null) ? prev : landmarks !== null));
    },
    onFrameDiagnostics: (diagnostics: FrameDiagnostics | null) => {
      overlayRef.current?.draw(latestLandmarksRef.current, diagnostics);
    },
  });

  useEffect(() => {
    if (!gesture || gesture === "UNKNOWN") {
      requireNeutralRef.current = false;
      onStableGestureRef.current?.(null);
      return;
    }
    onStableGestureRef.current?.(requireNeutralRef.current ? null : gesture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesture]);

  return (
    <div className="flex flex-col items-center gap-4">
      <CameraPreview
        ref={setVideoEl}
        stream={stream}
        overlay={
          <LandmarkOverlay ref={overlayRef} videoElement={videoEl} locked={gesture !== null} />
        }
      />
      {error ? (
        <ErrorState variant="inline" message={error} />
      ) : (
        <GestureReadout gesture={gesture} confidence={confidence} hasHand={hasHand} />
      )}
    </div>
  );
}

export function GestureCalibrationStage({ onStableGesture, resetKey }: GestureCalibrationStageProps) {
  return (
    <CameraPermissionGate>
      {(stream) => <CalibrationView stream={stream} onStableGesture={onStableGesture} resetKey={resetKey} />}
    </CameraPermissionGate>
  );
}
