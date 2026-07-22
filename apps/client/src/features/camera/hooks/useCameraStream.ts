import { useCallback, useEffect, useRef, useState } from "react";
import { describeCameraError } from "../utils/cameraErrors";

type CameraStatus = "idle" | "requesting" | "granted" | "denied";

/**
 * Owns the MediaStream's full lifecycle. Camera processing is entirely
 * local — this hook only ever hands the stream to a <video> element for
 * MediaPipe to read locally; nothing here transmits anything anywhere.
 *
 * Cleanup is the critical correctness property: every returned stream's
 * tracks are stopped exactly once, whether the component unmounts, the
 * hook is asked to stop, or a new request supersedes an old one.
 */
export function useCameraStream() {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const requestCamera = useCallback(async () => {
    // Guard against a duplicate in-flight request (e.g. a fast double
    // click) leaking an extra stream.
    if (status === "requesting") return;
    stopStream();
    setStatus("requesting");
    setError(null);

    // getUserMedia only exists in a "secure context" — https://, or
    // http://localhost specifically. On any other http:// origin
    // (e.g. a LAN IP typed directly, per apps/client/.env.example's
    // phone-testing note) navigator.mediaDevices is undefined entirely,
    // so the browser never shows its native permission prompt at all —
    // there's no permission decision to make, the API simply isn't
    // there. Checking this explicitly, rather than only catching the
    // resulting TypeError below, means the message is instant and
    // exact instead of depending on the error path.
    if (!navigator.mediaDevices?.getUserMedia) {
      const message =
        `Camera access isn't available on this page (${window.location.protocol}//${window.location.host}). ` +
        "This API only works over HTTPS, or on http://localhost specifically — not a raw LAN IP or a non-localhost hostname over plain HTTP.";
      // eslint-disable-next-line no-console
      console.error("[RockLink] getUserMedia unavailable:", {
        protocol: window.location.protocol,
        host: window.location.host,
        isSecureContext: window.isSecureContext,
      });
      setError(message);
      setStatus("denied");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // frameRate is a request, not a guarantee — actual achieved fps
        // still depends on the camera hardware and browser. This is
        // capture fps only; useGestureDetector's own inference loop
        // deliberately stays throttled to 15fps regardless of this,
        // since MediaPipe inference at 60fps would be far heavier for
        // no real gameplay benefit in a turn-based game.
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 60 },
        },
        audio: false,
      });
      // The component can unmount while getUserMedia is still in
      // flight (e.g. a fast navigation away from the camera step).
      // Without this check, a stream that resolves afterward would be
      // assigned to streamRef but never stopped — the unmount cleanup
      // effect below already ran and won't run again — leaving the
      // camera light on indefinitely. Stop it immediately instead of
      // adopting it.
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setStatus("granted");
    } catch (err) {
      if (!mountedRef.current) return;
      // eslint-disable-next-line no-console
      console.error(
        "[RockLink] getUserMedia failed:",
        err instanceof Error ? err.name : typeof err,
        err instanceof Error ? err.message : err,
      );
      setError(describeCameraError(err));
      setStatus("denied");
    }
  }, [status, stopStream]);

  // Guarantees the camera light actually turns off — runs on every
  // unmount, regardless of which status we were in.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopStream();
    };
  }, [stopStream]);

  return { status, error, stream: streamRef.current, requestCamera, stopStream };
}
