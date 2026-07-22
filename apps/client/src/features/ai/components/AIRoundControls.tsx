import { GlassPanel } from "@/shared/components/GlassPanel";
import { Button } from "@/shared/components/Button";

interface AIRoundControlsProps {
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
}

/**
 * AI mode's counterpart to RematchPanel — deliberately a separate,
 * simpler component rather than reusing RematchPanel directly:
 * RematchPanel's copy ("Waiting for opponent…", "Your opponent wants a
 * rematch!") describes a two-human negotiation that doesn't apply here
 * — the AI has no opinion and never has to be waited on. Still built
 * entirely from the same GlassPanel/Button primitives, no new visual
 * language.
 */
export function AIRoundControls({ onPlayAgain, onChangeDifficulty }: AIRoundControlsProps) {
  return (
    <GlassPanel glow="none" className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <Button variant="primary" onClick={onPlayAgain}>
        Play Again
      </Button>
      <Button variant="ghost" onClick={onChangeDifficulty}>
        Change Difficulty
      </Button>
    </GlassPanel>
  );
}
