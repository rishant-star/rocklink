import { GlassPanel } from "@/shared/components/GlassPanel";
import { Button } from "@/shared/components/Button";
import { Text } from "@/shared/components/Text";

interface RematchPanelProps {
  selfRequested: boolean;
  opponentRequested: boolean;
  onRequestRematch: () => void;
}

/**
 * Flow per the approved design: Play Again -> Waiting for Opponent.
 * No timeout — the server waits indefinitely, so this panel simply
 * reflects whichever state it's told, with no countdown of its own.
 */
export function RematchPanel({ selfRequested, opponentRequested, onRequestRematch }: RematchPanelProps) {
  if (selfRequested) {
    return (
      <GlassPanel glow="none" className="flex flex-col items-center gap-2" role="status" aria-live="polite">
        <Text size="md" tone="muted">
          Waiting for opponent…
        </Text>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel
      glow={opponentRequested ? "primary" : "none"}
      className="flex flex-col items-center gap-3"
      role="status"
      aria-live="polite"
    >
      {opponentRequested && <Text size="md">Your opponent wants a rematch!</Text>}
      <Button variant="primary" onClick={onRequestRematch}>
        Play Again
      </Button>
    </GlassPanel>
  );
}
