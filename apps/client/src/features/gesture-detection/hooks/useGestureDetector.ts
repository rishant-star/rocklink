import { useEffect, useRef, useState } from "react";
import type { Results } from "@mediapipe/hands";
import { createHandsClient } from "../mediapipe/handsClient";
import { classifyGesture, countExtendedFingers } from "../classifier/gestureClassifier";
import { GestureStabilizer, type StabilizedState } from "../classifier/gestureStabilizer";
import type { FrameDiagnostics, HandLandmarks } from "../types";

const TARGET_FPS = 15;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
// Confidence is recomputed fresh from raw landmarks every frame and
// naturally jitters by small fractions even when a pose is held
// perfectly still. Rounding to the nearest 5% before it ever reaches
// React state collapses that jitter into identical values across most
// frames, so we're not re-rendering ~15 times/second once a gesture
// becomes stable — comparing raw floats here would defeat the whole
// point of keeping this out of per-frame state.
const CONFIDENCE_STEP = 0.05;
// After this many consecutive failed frames (e.g. missing model
// assets), stop treating it as "no hand visible yet" and surface it as
// an actual error instead.
const MAX_CONSECUTIVE_FAILURES = 10;

interface UseGestureDetectorOptions {
  videoElement: HTMLVideoElement | null;
  /** Only runs the pipeline while true — e.g. gated to the "detecting" match phase in a later milestone. */
  active: boolean;
  /**
   * Called every processed frame with the raw landmarks (or null when
   * no hand is visible). Deliberately NOT React state — at 15fps this
   * would mean 15 re-renders/second of everything subscribed to it.
   * Consumers (like LandmarkOverlay) should draw directly from this
   * callback, not via component state.
   */
  onFrameLandmarks?: (landmarks: HandLandmarks | null) => void;
  /**
   * Release Candidate HUD polish: surfaces per-frame data this hook
   * already had on hand but previously discarded — MediaPipe's own
   * handedness read, and the raw (non-stabilized) classification for
   * this exact frame. Same non-React-state discipline as
   * onFrameLandmarks above, for the same reason. Does not add any new
   * computation: `classification` below is the same value already
   * computed for the stabilizer on this line; this just also forwards
   * it instead of only ever handing it to `stabilizer.update()`.
   */
  onFrameDiagnostics?: (diagnostics: FrameDiagnostics | null) => void;
}

interface UseGestureDetectorResult extends StabilizedState {
  /** Set once repeated frame failures suggest the pipeline itself failed to load (e.g. missing model assets), not just "no hand visible." */
  error: string | null;
}

function roundConfidence(value: number): number {
  return Math.round(value / CONFIDENCE_STEP) * CONFIDENCE_STEP;
}

/**
 * Owns the full local pipeline: a Hands instance, a throttled capture
 * loop, classification, and stabilization. Returns only the *stabilized*
 * gesture/confidence as React state, since that's the only piece that
 * changes at a UI-relevant rate rather than every frame.
 *
 * Lifecycle is the critical property here: the Hands instance and the
 * capture loop are both fully torn down whenever `active` goes false or
 * the component unmounts — verified explicitly, not just assumed.
 */
export function useGestureDetector({
  videoElement,
  active,
  onFrameLandmarks,
  onFrameDiagnostics,
}: UseGestureDetectorOptions): UseGestureDetectorResult {
  const [stable, setStable] = useState<StabilizedState>({ gesture: null, confidence: 0 });
  const [error, setError] = useState<string | null>(null);
  const onFrameLandmarksRef = useRef(onFrameLandmarks);
  onFrameLandmarksRef.current = onFrameLandmarks;
  const onFrameDiagnosticsRef = useRef(onFrameDiagnostics);
  onFrameDiagnosticsRef.current = onFrameDiagnostics;

  useEffect(() => {
    if (!active || !videoElement) {
      setStable({ gesture: null, confidence: 0 });
      setError(null);
      return;
    }

    // Re-bound to a local const so TypeScript's null-check narrowing
    // above actually holds inside loop() below — a plain closure over
    // the (nullable-typed) `videoElement` parameter doesn't carry that
    // narrowing across function boundaries.
    const video = videoElement;

    let disposed = false;
    let rafId = 0;
    let lastFrameTime = 0;
    let consecutiveFailures = 0;
    let hasProcessedFrame = false;
    let inferenceInFlight = false;
    const stabilizer = new GestureStabilizer();

    function handleResults(results: Results) {
      if (disposed) return;
      consecutiveFailures = 0; // a result callback firing at all means the pipeline is alive
      hasProcessedFrame = true;
      // The failure counter above is a local variable, not React
      // state — resetting it alone doesn't clear an error message
      // already shown to the user. Without this, a few transient
      // rejections during MediaPipe's own startup/WASM warm-up (before
      // it's ready to process frames) could trip the 10-failure
      // threshold below, set the error, and then the pipeline goes on
      // to work perfectly fine — but the error banner stays stuck on
      // screen forever, since nothing ever told it to go away.
      setError((prev) => (prev === null ? prev : null));
      const landmarks = (results.multiHandLandmarks?.[0] as HandLandmarks | undefined) ?? null;
      onFrameLandmarksRef.current?.(landmarks);

      const classification = landmarks
        ? classifyGesture(landmarks)
        : ({ gesture: "UNKNOWN", confidence: 0 } as const);

      if (onFrameDiagnosticsRef.current) {
        if (!landmarks) {
          onFrameDiagnosticsRef.current(null);
        } else {
          const handednessResult = results.multiHandedness?.[0];
          onFrameDiagnosticsRef.current({
            handedness: handednessResult
              ? { label: handednessResult.label as "Left" | "Right", confidence: handednessResult.score }
              : null,
            rawGesture: classification,
            fingerCount: countExtendedFingers(landmarks),
          });
        }
      }

      const rawNext = stabilizer.update(classification);
      const next: StabilizedState = { ...rawNext, confidence: roundConfidence(rawNext.confidence) };
      setStable((prev) => (sameState(prev, next) ? prev : next));
    }

    const hands = createHandsClient(handleResults);

    function loop(timestamp: number) {
      if (disposed) return;
      // Skip actual inference while the tab is backgrounded — the rAF
      // tick itself is negligible cost, but MediaPipe's inference is not.
      if (!document.hidden && timestamp - lastFrameTime >= FRAME_INTERVAL_MS) {
        lastFrameTime = timestamp;
        if (video.readyState >= 2 && !inferenceInFlight) {
          inferenceInFlight = true;
          void (async () => {
            try {
              await hands.send({ image: video });
            } catch {
            // A rejected send() can mean either mid-teardown (harmless,
            // `disposed` guards against acting on it) or a genuinely
            // broken pipeline (e.g. model assets failed to load) —
            // track consecutive failures to distinguish "no hand yet"
            // from "this never worked."
            if (disposed) return;
            consecutiveFailures += 1;
            if (!hasProcessedFrame && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              setError(
                "Hand tracking could not initialize. Check your connection and refresh to try again.",
              );
            }
            } finally {
              inferenceInFlight = false;
            }
          })();
        }
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      hands.close();
      stabilizer.reset();
      setStable({ gesture: null, confidence: 0 });
      setError(null);
    };
  }, [active, videoElement]);

  return { ...stable, error };
}

function sameState(a: StabilizedState, b: StabilizedState): boolean {
  return a.gesture === b.gesture && a.confidence === b.confidence;
}
