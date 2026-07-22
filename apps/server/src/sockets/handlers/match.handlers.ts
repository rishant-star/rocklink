import type { RoomManager } from "../../rooms/RoomManager.js";
import type { AppServer, AppSocket } from "../types.js";
import { resolveAndBroadcastResult, startRound } from "../../game/roundOrchestrator.js";

/**
 * Socket.IO transport only. Gameplay orchestration (starting/resolving
 * a round) lives in game/roundOrchestrator.ts — this file's job is
 * translating events into calls there, not owning the sequencing.
 */
export function registerMatchHandlers(io: AppServer, socket: AppSocket, roomManager: RoomManager) {
  socket.on("match:gestureLock", ({ gesture }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomManager.get(roomId);
    if (!room) return;

    const result = room.lockGesture(socket.id, gesture);
    // Unknown socket, or a submission after this player already locked —
    // ignored outright per "ignore any subsequent gesture submissions."
    if (!result || result.alreadyLocked) return;

    // Notify only the opponent, and only that a lock happened — never
    // the gesture itself. This is what "gestures remain secret until
    // the server reveals the result" means at the protocol level: the
    // event literally carries no gesture payload, so there's no
    // handler-discipline required to keep it secret.
    socket.to(roomId).emit("match:opponentLocked");

    if (result.bothLocked) {
      resolveAndBroadcastResult(io, room, roomId);
    }
  });

  socket.on("match:rematchRequest", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomManager.get(roomId);
    if (!room) return;

    // Ignored outright if the room isn't actually in a post-round state
    // (e.g. a stray/duplicate event mid-round) — same "ignore invalid
    // submissions" discipline already applied to gesture locks.
    const result = room.requestRematch(socket.id);
    if (!result) return;

    if (result.bothAgreed) {
      io.to(roomId).emit("match:rematchAccepted");
      startRound(io, room, roomId);
    } else {
      io.to(roomId).emit("match:rematchPending", { requestedBy: result.playerId });
    }
  });
}
