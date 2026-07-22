import { motion, AnimatePresence } from "framer-motion";
import { useConnectionStore } from "../services/socket/useConnectionStore";
import { Text } from "./Text";

const copy: Record<"connecting" | "reconnecting" | "disconnected" | "failed", string> = {
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  disconnected: "Connection lost",
  failed: "Connection failed",
};

const dotClass: Record<"connecting" | "reconnecting" | "disconnected" | "failed", string> = {
  connecting: "bg-secondary",
  reconnecting: "bg-secondary",
  disconnected: "bg-danger",
  failed: "bg-danger",
};

interface ConnectionStatusBadgeProps {
  /** Current route pathname, passed down from RootLayout (which already computes it via useLocation) rather than this component calling useLocation itself. */
  pathname: string;
}

/**
 * Design-System.md Section 7: connection issues use a persistent,
 * non-blocking corner badge rather than a modal, so a brief reconnect
 * doesn't interrupt the player. Interpreting "persistent" as "doesn't
 * require dismissal" rather than "always visible" — showing nothing
 * while connected keeps a permanently-healthy status from cluttering
 * the premium UI with a redundant "Connected" chip.
 *
 * Suppressed entirely on /ai: Player vs AI is explicitly local-only —
 * no server, no Socket.IO (see the Player vs AI spec) — so the app-wide
 * socket connection is never actually relevant there. Without this,
 * anyone playing AI mode without the server running (which the mode
 * doesn't require) would see a permanent, alarming "Reconnecting…"
 * chip for a connection their current page never needed in the first
 * place.
 */
export function ConnectionStatusBadge({ pathname }: ConnectionStatusBadgeProps) {
  const status = useConnectionStore((s) => s.status);
  const visible = status !== "connected" && !pathname.startsWith("/ai");

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-toast sm:bottom-6 sm:right-6"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 rounded-panel-sm border border-glass-border bg-bg-elevated/90 px-3 py-2 backdrop-blur-panel"
          >
            <span
              aria-hidden="true"
              className={["h-2 w-2 rounded-full", dotClass[status as "connecting" | "reconnecting" | "disconnected" | "failed"]].join(
                " ",
              )}
            />
            <Text size="caption" tone="muted" className="normal-case tracking-normal">
              {copy[status as "connecting" | "reconnecting" | "disconnected" | "failed"]}
            </Text>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
