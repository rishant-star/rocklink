import { GlassPanel } from "@/shared/components/GlassPanel";
import { Heading } from "@/shared/components/Heading";
import { Text } from "@/shared/components/Text";
import type { BestOf } from "../services/series";

interface MatchLengthSelectorProps {
  value: BestOf;
  onChange: (bestOf: BestOf) => void;
}

export function MatchLengthSelector({ value, onChange }: MatchLengthSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Match length" className="grid grid-cols-2 gap-3">
      {([3, 5] as const).map((bestOf) => {
        const selected = value === bestOf;
        return (
          <button key={bestOf} type="button" role="radio" aria-checked={selected} onClick={() => onChange(bestOf)} className="rounded-panel text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-bg">
            <GlassPanel glow={selected ? "primary" : "none"} gradientBorder={selected} className="flex h-full flex-col gap-2">
              <Heading level="md" as="p" className={selected ? "text-primary" : undefined}>Best of {bestOf}</Heading>
              <Text size="caption" tone="muted" className="normal-case tracking-normal">First to {Math.floor(bestOf / 2) + 1}</Text>
            </GlassPanel>
          </button>
        );
      })}
    </div>
  );
}
