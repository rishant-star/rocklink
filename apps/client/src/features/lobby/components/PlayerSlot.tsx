import { motion } from "framer-motion";
import type { PlayerInfo } from "@rocklink/shared-types";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Text } from "@/shared/components/Text";
import { SkeletonPanel } from "@/shared/components/Skeleton";
import { glowPulse } from "@/shared/animations/variants";

interface PlayerSlotProps {
  player?: PlayerInfo;
  role: "host" | "guest";
  isSelf: boolean;
}

export function PlayerSlot({ player, role, isSelf }: PlayerSlotProps) {
  if (!player) {
    return (
      <GlassPanel glow="none" className="flex flex-col items-center justify-center gap-3 text-center">
        <SkeletonPanel height="40px" className="w-24 rounded-full" />
        <Text size="caption" tone="muted" className="normal-case tracking-normal">
          Waiting for opponent…
        </Text>
      </GlassPanel>
    );
  }

  const statusLabel = !player.connected ? "Reconnecting…" : player.ready ? "Ready" : "Not ready";

  return (
    <GlassPanel
      glow={player.connected && player.ready ? "primary" : "none"}
      className="flex flex-col items-center justify-center gap-2 text-center"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={["h-2 w-2 rounded-full", player.connected ? "bg-success" : "bg-danger"].join(" ")}
        />
        <Text size="caption" tone="muted" className="normal-case tracking-normal">
          {role === "host" ? "Host" : "Guest"}
          {isSelf ? " (You)" : ""}
        </Text>
      </div>
      <motion.div
        variants={glowPulse}
        initial="initial"
        animate={player.connected && player.ready ? "pulse" : "initial"}
        className="rounded-panel-sm px-3 py-1"
        role="status"
        aria-live="polite"
      >
        <Text size="lg">{statusLabel}</Text>
      </motion.div>
    </GlassPanel>
  );
}
