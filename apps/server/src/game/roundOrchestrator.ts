import type { Room } from "../rooms/Room.js";
import type { AppServer } from "../sockets/types.js";
import { config } from "../config/index.js";

/**
 * Round lifecycle orchestration: starting a round (countdown -> gesture
 * window) and resolving it once both gestures are locked in. Lives here,
 * alongside GameEngine and CountdownAuthority, rather than in a socket
 * handler — handlers stay responsible for translating Socket.IO events
 * into calls here, not for owning the round's own sequencing.
 *
 * Both room.handlers.ts (Ready-triggered start) and match.handlers.ts
 * (rematch-triggered restart, and gesture-lock-triggered resolution)
 * call these same two functions — there is exactly one "start a round"
 * and one "resolve a round" implementation in the codebase.
 */

export function resolveAndBroadcastResult(io: AppServer, room: Room, roomId: string): void {
  const result = room.resolveRound();
  if (!result) return;
  io.to(roomId).emit("match:result", { ...result, score: room.score });
}

export function startRound(io: AppServer, room: Room, roomId: string): void {
  room.beginCountdown(
    (value, serverTimestamp) => {
      io.to(roomId).emit("match:countdownTick", { value, serverTimestamp });
    },
    () => {
      room.beginGestureWindow(config.gestureWindowTimeoutMs, (forcedPlayerIds) => {
        // The deadline was reached without one or both players
        // submitting. Notify each forced player's opponent, exactly
        // the same way the natural-lock path does — from the
        // opponent's perspective, "my opponent just locked" is true
        // regardless of whether that happened by choice or by clock.
        for (const forcedId of forcedPlayerIds) {
          const opponentSocketId = room.players.find((p) => p.id !== forcedId)?.socketId;
          if (opponentSocketId) {
            io.to(opponentSocketId).emit("match:opponentLocked");
          }
        }
        resolveAndBroadcastResult(io, room, roomId);
      });
    },
  );
}
