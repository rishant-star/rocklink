import { GlassPanel } from "@/shared/components/GlassPanel";
import { Text } from "@/shared/components/Text";

interface GestureLockIndicatorProps {
  localLocked: boolean;
  opponentLocked: boolean;
}

/**
 * Deliberately shows only lock status, never the gesture itself — the
 * gesture stays secret until a later phase reveals it. This component
 * exists to make that protocol behavior observable in the running app,
 * not to add any gameplay logic of its own.
 */
export function GestureLockIndicator({ localLocked, opponentLocked }: GestureLockIndicatorProps) {
  return (
    <GlassPanel glow="none" className="flex flex-row items-center justify-center gap-6">
      <LockStatus label="You" locked={localLocked} />
      <LockStatus label="Opponent" locked={opponentLocked} />
    </GlassPanel>
  );
}

function LockStatus({ label, locked }: { label: string; locked: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1" role="status" aria-live="polite">
      <Text size="caption" tone="muted" className="normal-case tracking-normal">
        {label}
      </Text>
      <span
        className={[
          "h-2 w-2 rounded-full",
          locked ? "bg-success" : "bg-glass-border",
        ].join(" ")}
        aria-hidden="true"
      />
      <Text size="md">{locked ? "Locked" : "Waiting…"}</Text>
    </div>
  );
}
