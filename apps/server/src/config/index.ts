export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  roomTtlMs: 10 * 60 * 1000, // 10 min inactivity before a room auto-expires
  // How long a disconnected player's slot stays reserved before being
  // permanently removed (and, if they were host, the remaining player
  // promoted). Covers brief network drops and accidental refreshes
  // without prematurely ejecting someone from an active lobby.
  reconnectGraceMs: 20 * 1000,
  // How long the gesture-lock window stays open before the server
  // force-resolves any player who hasn't submitted as a NONE forfeit.
  // This is the *only* deadline in the system — the client has no
  // timeout of its own; it simply submits whenever it detects a stable
  // gesture, and this is what guarantees the round can't stall forever.
  gestureWindowTimeoutMs: 6 * 1000,
  countdown: {
    startValue: 3,
    tickIntervalMs: 1000,
  },
  /**
   * Release Gate #1 (RELEASE_SIGNOFF.md): real thresholds, not tuned
   * against production traffic (this project has never had any) — set
   * conservatively enough to stop scripted abuse of a two-player, low-
   * frequency protocol without affecting any legitimate play pattern.
   * Revisit once real usage data exists.
   */
  rateLimits: {
    // New socket connections allowed per client IP per rolling window.
    connectionsPerIp: { max: 20, windowMs: 60 * 1000 },
    // Per-socket, per-event-name limits enforced on every inbound
    // client-to-server event (see sockets/middleware/rateLimit.ts).
    events: {
      "room:create": { max: 5, windowMs: 10 * 1000 },
      "room:join": { max: 10, windowMs: 10 * 1000 },
      "room:ready": { max: 10, windowMs: 5 * 1000 },
      "match:gestureLock": { max: 5, windowMs: 5 * 1000 },
      "match:rematchRequest": { max: 5, windowMs: 5 * 1000 },
    },
  },
} as const;
