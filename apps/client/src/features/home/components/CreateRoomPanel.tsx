import { GlassPanel } from "@/shared/components/GlassPanel";
import { Button } from "@/shared/components/Button";
import { Text } from "@/shared/components/Text";
import { useCreateRoom } from "../hooks/useCreateRoom";
import { ErrorState } from "@/shared/components/ErrorState";

/**
 * The primary action gets the gradient-border treatment (opt-in on
 * GlassPanel, off by default) — Design-System.md Section 1 reserves it
 * for the moments that should draw the eye first, and this is that
 * moment on the Home screen.
 */
export function CreateRoomPanel() {
  const { createRoom, isCreating, error } = useCreateRoom();

  return (
    <GlassPanel glow="primary" gradientBorder className="flex flex-col gap-3">
      <Text size="caption" tone="muted" className="normal-case tracking-normal">
        Start a match
      </Text>
      <Button variant="primary" onClick={createRoom} disabled={isCreating}>
        {isCreating ? "Creating room…" : "Create Room"}
      </Button>
      {error && <ErrorState variant="inline" message={error} />}
      <Text size="caption" tone="muted" className="normal-case tracking-normal">
        You'll get a link to share with your opponent.
      </Text>
    </GlassPanel>
  );
}
