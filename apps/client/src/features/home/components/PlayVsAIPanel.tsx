import { useNavigate } from "react-router-dom";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Button } from "@/shared/components/Button";
import { Text } from "@/shared/components/Text";

/**
 * Player vs AI's Home entry point. Uses the "accent" glow (the one
 * primary glow token CreateRoomPanel/JoinRoomPanel don't already use)
 * so both game modes read as equally weighted choices rather than one
 * looking like an afterthought — same GlassPanel/Button/Text primitives
 * as every other Home panel, no new visual language.
 *
 * Navigates via useNavigate rather than wrapping Button in a <Link>,
 * matching useCreateRoom's existing convention and avoiding an invalid
 * <button> nested inside an <a>.
 */
export function PlayVsAIPanel() {
  const navigate = useNavigate();

  return (
    <GlassPanel glow="accent" className="flex flex-col gap-3">
      <Text size="caption" tone="muted" className="normal-case tracking-normal">
        No opponent? No problem
      </Text>
      <Button variant="primary" onClick={() => navigate("/ai")} className="w-full">
        Play vs AI
      </Button>
      <Text size="caption" tone="muted" className="normal-case tracking-normal">
        Pick a difficulty and play immediately — no server, no waiting.
      </Text>
    </GlassPanel>
  );
}
