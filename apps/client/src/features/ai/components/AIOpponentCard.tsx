import { AnimatePresence, motion } from "framer-motion";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Icon } from "@/shared/components/Icon";
import { Text } from "@/shared/components/Text";
import { Heading } from "@/shared/components/Heading";
import { fadeUp, glowPulse } from "@/shared/animations/variants";
import type { AIMatchPhase } from "../store/useAIMatchStore";
import { DIFFICULTIES, type AIDifficulty } from "../services/Difficulty";

interface AIOpponentCardProps {
  difficulty: AIDifficulty;
  phase: AIMatchPhase;
}

type Status = "standby" | "reading" | "thinking";

function statusFor(phase: AIMatchPhase): Status {
  if (phase === "ai-thinking") return "thinking";
  if (phase === "detecting") return "reading";
  return "standby";
}

/**
 * Stands in for the "opponent camera" multiplayer would otherwise show
 * — reuses GlassPanel, Icon, Text, Heading, and the existing fadeUp /
 * glowPulse animation variants exclusively (no new visual language),
 * composed into a scanning-HUD / neural-hologram presentation per the
 * Player vs AI brief ("Think Riot Client. Think Valorant.").
 */
export function AIOpponentCard({ difficulty, phase }: AIOpponentCardProps) {
  const status = statusFor(phase);
  const config = DIFFICULTIES.find((d) => d.id === difficulty)!;
  const glow = status === "thinking" ? "accent" : status === "reading" ? "secondary" : "none";

  return (
    <GlassPanel glow={glow} className="relative flex aspect-video flex-col items-center justify-center gap-4 overflow-hidden p-0">
      {/* Concentric scanning rings — decorative chrome only, built from
          Tailwind's built-in animate-spin/animate-pulse utilities
          rather than a bespoke animation system. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div
          className={[
            "h-40 w-40 rounded-full border",
            status === "standby" ? "border-glass-border" : "border-secondary/40",
            status !== "standby" ? "animate-spin" : "",
          ].join(" ")}
          style={{ animationDuration: "6s" }}
        />
        <div
          className={[
            "absolute h-28 w-28 rounded-full border",
            status === "thinking" ? "border-accent/50 animate-spin" : "border-glass-border/60",
          ].join(" ")}
          style={{ animationDuration: "3s", animationDirection: "reverse" }}
        />
      </div>

      <motion.div
        variants={status === "thinking" ? glowPulse : undefined}
        initial="initial"
        animate={status === "thinking" ? "pulse" : undefined}
        className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-glass-border bg-bg-elevated/70"
      >
        <Icon size="lg" className={status === "thinking" ? "text-accent" : "text-secondary"}>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <path d="M9 8h.01M15 8h.01" />
        </Icon>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="relative z-10 flex flex-col items-center gap-1"
        >
          <Text size="caption" tone="muted" className="tracking-widest text-secondary">
            {status === "standby" && "Standby"}
            {status === "reading" && "Reading the room…"}
            {status === "thinking" && "AI Thinking…"}
          </Text>
          <Heading level="md" as="p">
            RockLink AI
          </Heading>
        </motion.div>
      </AnimatePresence>

      <div className="absolute right-3 top-3 z-10 rounded-full border border-glass-border bg-bg/60 px-3 py-1 backdrop-blur-panel">
        <Text size="caption" tone="muted" className="text-secondary">
          {config.badge}
        </Text>
      </div>
    </GlassPanel>
  );
}
