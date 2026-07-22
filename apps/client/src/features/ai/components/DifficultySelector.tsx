import { GlassPanel } from "@/shared/components/GlassPanel";
import { Text } from "@/shared/components/Text";
import { Heading } from "@/shared/components/Heading";
import { DIFFICULTIES, type AIDifficulty } from "../services/Difficulty";

interface DifficultySelectorProps {
  value: AIDifficulty | null;
  onChange: (difficulty: AIDifficulty) => void;
}

/**
 * Reuses GlassPanel/Text/Heading (no new visual primitives) as a
 * selectable card grid. Each card is a real <button> for keyboard/
 * screen-reader access, wrapped in role="radiogroup" since exactly one
 * difficulty is selected at a time.
 */
export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <div role="radiogroup" aria-label="AI difficulty" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {DIFFICULTIES.map((difficulty) => {
        const selected = difficulty.id === value;
        return (
          <button
            key={difficulty.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(difficulty.id)}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-panel"
          >
            <GlassPanel
              glow={selected ? "primary" : "none"}
              gradientBorder={selected}
              className="flex h-full flex-col gap-2 transition-shadow duration-transition"
            >
              <Heading level="md" as="p" className={selected ? "text-primary" : undefined}>
                {difficulty.label}
              </Heading>
              <Text size="caption" tone="muted" className="normal-case tracking-normal">
                {difficulty.description}
              </Text>
            </GlassPanel>
          </button>
        );
      })}
    </div>
  );
}
