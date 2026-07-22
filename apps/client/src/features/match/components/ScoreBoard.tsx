import type { PlayerId, Score } from "@rocklink/shared-types";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Text } from "@/shared/components/Text";

interface ScoreBoardProps {
  score: Score;
  selfId: PlayerId;
}

export function ScoreBoard({ score, selfId }: ScoreBoardProps) {
  const opponentId: PlayerId = selfId === "p1" ? "p2" : "p1";

  return (
    <GlassPanel glow="none" className="flex items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-1">
        <Text size="caption" tone="muted" className="normal-case tracking-normal">
          You
        </Text>
        <Text size="lg">{score[selfId]}</Text>
      </div>
      <Text size="lg" tone="muted">
        –
      </Text>
      <div className="flex flex-col items-center gap-1">
        <Text size="caption" tone="muted" className="normal-case tracking-normal">
          Opponent
        </Text>
        <Text size="lg">{score[opponentId]}</Text>
      </div>
    </GlassPanel>
  );
}
