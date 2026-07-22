import { ReactNode } from "react";
import { Button } from "@/shared/components/Button";
import { ErrorState } from "@/shared/components/ErrorState";
import { SkeletonPanel } from "@/shared/components/Skeleton";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Text } from "@/shared/components/Text";
import { useCameraStream } from "../hooks/useCameraStream";

interface CameraPermissionGateProps {
  children: (stream: MediaStream) => ReactNode;
}

/**
 * Gates camera-dependent children behind a permission request. Renders
 * one of: an initial prompt, a loading skeleton while the browser's own
 * permission dialog is open, an ErrorState on denial/failure with a
 * retry action, or the children once a stream is granted.
 */
export function CameraPermissionGate({ children }: CameraPermissionGateProps) {
  const { status, error, stream, requestCamera } = useCameraStream();

  if (status === "granted" && stream) {
    return <>{children(stream)}</>;
  }

  if (status === "requesting") {
    return <SkeletonPanel height="280px" />;
  }

  if (status === "denied") {
    return (
      <ErrorState
        variant="fullPanel"
        message={error ?? "Camera access failed."}
        actionLabel="Try Again"
        onAction={requestCamera}
      />
    );
  }

  return (
    <GlassPanel glow="none" className="flex flex-col items-center gap-4 text-center">
      <Text size="md">Ready to play? We'll need your camera to see your hand.</Text>
      <Text size="caption" tone="muted" className="normal-case tracking-normal">
        Nothing is recorded or sent anywhere — gestures are detected locally in your browser.
      </Text>
      <Button variant="primary" onClick={requestCamera}>
        Enable Camera
      </Button>
    </GlassPanel>
  );
}
