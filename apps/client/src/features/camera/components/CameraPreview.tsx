import { ReactNode, forwardRef, useEffect, useRef } from "react";
import { GlassPanel } from "@/shared/components/GlassPanel";

interface CameraPreviewProps {
  stream: MediaStream;
  overlay?: ReactNode;
}

/**
 * Renders the live camera feed. Mirrored (scaleX(-1)) so the preview
 * matches a natural selfie-view rather than a security-camera feel.
 * `overlay` is for the landmark canvas / gesture readout to sit on top
 * of the video without this component needing to know anything about
 * MediaPipe.
 */
export const CameraPreview = forwardRef<HTMLVideoElement, CameraPreviewProps>(
  ({ stream, overlay }, forwardedRef) => {
    const internalRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const video = internalRef.current;
      if (!video) return;
      video.srcObject = stream;
      // Cutting srcObject on cleanup releases the element's reference to
      // the stream; the stream's own tracks are stopped by
      // useCameraStream, not here — this component doesn't own the
      // stream's lifecycle, only its presentation.
      return () => {
        video.srcObject = null;
      };
    }, [stream]);

    return (
      <GlassPanel glow="secondary" className="relative aspect-video overflow-hidden p-0">
        <video
          ref={(node) => {
            internalRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          autoPlay
          playsInline
          muted
          aria-label="Live camera preview"
          className="h-full w-full scale-x-[-1] object-contain"
        />
        {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
      </GlassPanel>
    );
  },
);

CameraPreview.displayName = "CameraPreview";
