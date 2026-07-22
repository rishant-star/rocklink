import { GlassPanel } from "@/shared/components/GlassPanel";
import { Icon } from "@/shared/components/Icon";
import { Text } from "@/shared/components/Text";

/**
 * UI-only per Phase 3 scope — no getUserMedia call, no permission
 * request. Actual camera/MediaPipe wiring is explicitly out of scope
 * for this phase (Blueprint Phase 3: Camera & Gesture Detection).
 */
export function CameraReadinessCard() {
  return (
    <GlassPanel glow="none" className="flex items-center gap-4">
      <Icon size="lg" className="shrink-0 text-secondary">
        <rect x="3" y="7" width="13" height="10" rx="2" />
        <path d="M16 10l5-3v10l-5-3" />
      </Icon>
      <div className="min-w-0 flex-1">
        <Text size="md">Camera check happens when you enter a match</Text>
        <Text size="caption" tone="muted" className="mt-1 normal-case tracking-normal">
          Nothing is recorded or sent anywhere — gestures are detected locally in your browser.
        </Text>
      </div>
    </GlassPanel>
  );
}
