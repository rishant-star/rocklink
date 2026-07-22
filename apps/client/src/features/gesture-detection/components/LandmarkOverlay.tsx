import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { FrameDiagnostics, HandLandmarks } from "../types";

export interface LandmarkOverlayHandle {
  draw: (landmarks: HandLandmarks | null, diagnostics?: FrameDiagnostics | null) => void;
}

interface LandmarkOverlayProps {
  /**
   * The video element this overlay draws on top of. Needed so the
   * canvas's internal pixel resolution can match the video's *native*
   * resolution exactly — landmark coordinates are normalized [0,1]
   * relative to that native frame, not the CSS display box.
   */
  videoElement: HTMLVideoElement | null;
  /**
   * Whether the pipeline's *stabilized* gesture (not the raw per-frame
   * one) is currently locked in — i.e. `useGestureDetector`'s own
   * `gesture` field is non-null. This changes rarely (only at real
   * stabilization transitions), so unlike the imperative draw() traffic
   * it's completely safe as an ordinary React prop.
   */
  locked?: boolean;
}

// MediaPipe Hands' standard finger-bone connections, used to draw the
// skeleton lines between joints (not just dots for each landmark).
const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17],
];

// --color-secondary (cyan/electric blue) — the HUD's signature color
// for anything "actively scanning," per the premium-HUD brief. Kept as
// raw rgba here (not read from CSS custom properties) since canvas 2D
// APIs need literal color strings either way — matches the previous
// version's own approach, just re-tuned for the glow treatment below.
const SCAN_COLOR = "163, 163, 153"; // matches --color-secondary
const LOCKED_COLOR = "140, 164, 130"; // --color-success — brackets shift to this once a gesture is confidently locked.
// Reduced-motion fallback repaint cadence — matches the pipeline's own
// ~15fps inference cap rather than inventing an unrelated number.
const FRAME_INTERVAL_MS_FALLBACK = 1000 / 15;

/**
 * Premium "optical scanner" HUD overlay: canvas skeleton + corner
 * tracking brackets + scan-pulse + a small imperative debug readout.
 * Styled per the RC HUD brief (Riot/Valorant/Vision-Pro inspired) —
 * cyan glow, thin connection lines, brackets instead of a plain
 * rectangle — while remaining a pure *consumer* of whatever the
 * gesture-detection pipeline already produces: nothing here runs
 * MediaPipe, classifies a gesture, or duplicates any of that work.
 *
 * Two update rates, deliberately kept separate:
 * - The skeleton/handedness/confidence data updates only when `draw()`
 *   is called — i.e. at the pipeline's real ~15fps inference rate.
 *   Redrawing it faster wouldn't add real information, just noise.
 * - The corner brackets and scan-pulse run their own continuous
 *   requestAnimationFrame loop (skipped entirely under reduced-motion,
 *   same `matchMedia` pattern ParticleField already uses) so the
 *   decorative chrome feels alive at a full frame rate even though the
 *   actual tracking data only ticks over 15x/second — which is itself
 *   an honest reflection of the real sensor rate, not a fabricated one.
 *
 * Debug numbers (inference FPS, landmark/gesture confidence) are
 * written directly into DOM nodes via refs, not React state — matching
 * the rest of this pipeline's "no per-frame re-renders" discipline.
 */
export const LandmarkOverlay = forwardRef<LandmarkOverlayHandle, LandmarkOverlayProps>(
  ({ videoElement, locked = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [size, setSize] = useState({ width: 640, height: 480 });

    // Latest-known frame data, updated imperatively by draw() and read
    // every animation-frame tick by the persistent loop below. Refs, not
    // state — this is exactly the per-frame data the pipeline
    // deliberately keeps out of React's render cycle.
    const latestLandmarksRef = useRef<HandLandmarks | null>(null);
    const latestDiagnosticsRef = useRef<FrameDiagnostics | null>(null);
    const hasHandRef = useRef(false);
    const lockedRef = useRef(locked);
    const lastInferenceTimeRef = useRef(0);
    const inferenceFpsRef = useRef(0);

    const fpsTextRef = useRef<HTMLSpanElement | null>(null);
    const trackingConfTextRef = useRef<HTMLSpanElement | null>(null);
    const gestureConfTextRef = useRef<HTMLSpanElement | null>(null);
    const handednessTextRef = useRef<HTMLSpanElement | null>(null);
    const fingerCountTextRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
      lockedRef.current = locked;
    }, [locked]);

    useEffect(() => {
      if (!videoElement) return;
      function updateSize() {
        if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
          setSize({ width: videoElement.videoWidth, height: videoElement.videoHeight });
        }
      }
      updateSize();
      videoElement.addEventListener("loadedmetadata", updateSize);
      return () => videoElement.removeEventListener("loadedmetadata", updateSize);
    }, [videoElement]);

    useImperativeHandle(ref, () => ({
      draw(landmarks, diagnostics) {
        latestLandmarksRef.current = landmarks;
        latestDiagnosticsRef.current = diagnostics ?? null;
        hasHandRef.current = landmarks !== null;

        const now = performance.now();
        if (lastInferenceTimeRef.current > 0) {
          const delta = now - lastInferenceTimeRef.current;
          if (delta > 0) inferenceFpsRef.current = 1000 / delta;
        }
        lastInferenceTimeRef.current = now;

        if (fpsTextRef.current) {
          fpsTextRef.current.textContent = `${Math.round(inferenceFpsRef.current)}`;
        }
        if (gestureConfTextRef.current) {
          gestureConfTextRef.current.textContent = diagnostics
            ? `${Math.round(diagnostics.rawGesture.confidence * 100)}%`
            : "—";
        }
        if (trackingConfTextRef.current) {
          trackingConfTextRef.current.textContent = diagnostics?.handedness
            ? `${Math.round(diagnostics.handedness.confidence * 100)}%`
            : "—";
        }
        if (handednessTextRef.current) {
          handednessTextRef.current.textContent = diagnostics?.handedness?.label ?? "—";
        }
        if (fingerCountTextRef.current) {
          fingerCountTextRef.current.textContent =
            diagnostics && landmarks ? `${diagnostics.fingerCount}` : "—";
        }
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function drawSkeleton(width: number, height: number) {
        const landmarks = latestLandmarksRef.current;
        if (!landmarks || !ctx) return;

        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${SCAN_COLOR}, 0.9)`;
        ctx.strokeStyle = `rgba(${SCAN_COLOR}, 0.55)`;
        ctx.lineWidth = 1.5;
        for (const [a, b] of CONNECTIONS) {
          const pa = landmarks[a];
          const pb = landmarks[b];
          ctx.beginPath();
          ctx.moveTo(pa.x * width, pa.y * height);
          ctx.lineTo(pb.x * width, pb.y * height);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(${SCAN_COLOR}, 0.95)`;
        for (const point of landmarks) {
          ctx.beginPath();
          ctx.arc(point.x * width, point.y * height, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Corner tracking brackets — the HUD's replacement for a plain
      // rectangle. Length/inset are fixed proportions of the canvas so
      // they scale with whatever resolution the camera negotiated.
      function drawBrackets(width: number, height: number, pulse: number) {
        if (!ctx) return;
        const inset = Math.min(width, height) * 0.04;
        const armLength = Math.min(width, height) * 0.1;
        const hasHand = hasHandRef.current;
        const color = lockedRef.current ? LOCKED_COLOR : SCAN_COLOR;
        const alpha = hasHand ? 0.85 : 0.4 + pulse * 0.35;

        ctx.save();
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${color}, 0.8)`;

        const corners: [number, number, number, number][] = [
          [inset, inset, 1, 1], // top-left
          [width - inset, inset, -1, 1], // top-right
          [inset, height - inset, 1, -1], // bottom-left
          [width - inset, height - inset, -1, -1], // bottom-right
        ];
        for (const [x, y, dx, dy] of corners) {
          ctx.beginPath();
          ctx.moveTo(x, y + armLength * dy);
          ctx.lineTo(x, y);
          ctx.lineTo(x + armLength * dx, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Horizontal scan-line sweep while no hand is visible — the one
      // purely decorative animation, skipped entirely under
      // reduced-motion rather than just slowed down.
      function drawScanLine(width: number, height: number, t: number) {
        if (!ctx || hasHandRef.current) return;
        const y = ((Math.sin(t / 900) + 1) / 2) * height;
        const gradient = ctx.createLinearGradient(0, y - 20, 0, y + 20);
        gradient.addColorStop(0, `rgba(${SCAN_COLOR}, 0)`);
        gradient.addColorStop(0.5, `rgba(${SCAN_COLOR}, 0.25)`);
        gradient.addColorStop(1, `rgba(${SCAN_COLOR}, 0)`);
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y - 20, width, 40);
        ctx.restore();
      }

      if (prefersReducedMotion) {
        // Static equivalent: draw once per real data update only (via
        // draw() re-invoking this), no continuous loop, no scan-line,
        // no pulsing — brackets are still present and color-accurate,
        // just motionless.
        const renderStatic = () => {
          const { width, height } = canvas;
          ctx.clearRect(0, 0, width, height);
          drawBrackets(width, height, 0);
          drawSkeleton(width, height);
        };
        renderStatic();
        const interval = setInterval(renderStatic, FRAME_INTERVAL_MS_FALLBACK);
        return () => clearInterval(interval);
      }

      let frame: number;
      function tick(t: number) {
        if (!ctx || !canvas) return;
        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);
        const pulse = (Math.sin(t / 500) + 1) / 2;
        drawScanLine(width, height, t);
        drawBrackets(width, height, pulse);
        drawSkeleton(width, height);
        frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);

      return () => cancelAnimationFrame(frame);
    }, [size]);

    return (
      <>
        <canvas
          ref={canvasRef}
          width={size.width}
          height={size.height}
          aria-hidden="true"
          className="h-full w-full scale-x-[-1] object-contain"
        />
        {/* Small unobtrusive debug HUD panel — text nodes updated
            imperatively via refs above, not React state. */}
        <div
          aria-hidden="true"
          className="absolute bottom-2 left-2 flex flex-col gap-0.5 rounded-panel-sm border border-glass-border bg-bg/60 px-2 py-1.5 font-body text-[10px] uppercase tracking-wide text-text-muted backdrop-blur-panel"
        >
          <div className="flex justify-between gap-3">
            <span>Inference FPS</span>
            <span ref={fpsTextRef} className="text-secondary">—</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Tracking conf.</span>
            <span ref={trackingConfTextRef} className="text-secondary">—</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Gesture conf.</span>
            <span ref={gestureConfTextRef} className="text-secondary">—</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Hand</span>
            <span ref={handednessTextRef} className="text-secondary">—</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Finger count</span>
            <span ref={fingerCountTextRef} className="text-secondary">—</span>
          </div>
        </div>
      </>
    );
  },
);

LandmarkOverlay.displayName = "LandmarkOverlay";
