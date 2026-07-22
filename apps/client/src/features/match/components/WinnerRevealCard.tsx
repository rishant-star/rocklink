import { motion } from "framer-motion";
import type { MatchResult, PlayerId } from "@rocklink/shared-types";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Heading } from "@/shared/components/Heading";
import { Text } from "@/shared/components/Text";
import { cardFlip } from "@/shared/animations/variants";

interface WinnerRevealCardProps {
  result: MatchResult;
  selfId: PlayerId;
}

function formatGesture(gesture: string): string {
  if (gesture === "NONE") return "No gesture";
  return gesture.charAt(0) + gesture.slice(1).toLowerCase();
}

export function WinnerRevealCard({ result, selfId }: WinnerRevealCardProps) {
  const opponentId: PlayerId = selfId === "p1" ? "p2" : "p1";
  const didWin = result.winner === selfId;
  const isDraw = result.winner === "draw";

  const outcomeLabel = isDraw ? "Draw" : didWin ? "You Win!" : "You Lose";
  // Reusing existing text color tokens for the outcome; GlassPanel's
  // glow prop only supports primary/secondary/accent/none (Phase 2B),
  // so a loss uses "none" rather than inventing a new glow variant.
  const outcomeColorClass = isDraw ? "text-secondary" : didWin ? "text-success" : "text-danger";
  const glow = isDraw ? "secondary" : didWin ? "primary" : "none";

  return (
    <GlassPanel
      glow={glow}
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 text-center"
    >
      <motion.div variants={cardFlip} initial="hidden" animate="visible">
        <Heading level="lg" as="h2" className={outcomeColorClass}>
          {outcomeLabel}
        </Heading>
      </motion.div>
      <div className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <Text size="caption" tone="muted" className="normal-case tracking-normal">
            You
          </Text>
          <Text size="lg">{formatGesture(result.gestures[selfId])}</Text>
        </div>
        <Text size="lg" tone="muted">
          vs
        </Text>
        <div className="flex flex-col items-center gap-1">
          <Text size="caption" tone="muted" className="normal-case tracking-normal">
            Opponent
          </Text>
          <Text size="lg">{formatGesture(result.gestures[opponentId])}</Text>
        </div>
      </div>
    </GlassPanel>
  );
}
