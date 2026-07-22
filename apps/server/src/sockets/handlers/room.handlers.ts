import type { RoomManager } from "../../rooms/RoomManager.js";
import type { AppServer, AppSocket } from "../types.js";
import { config } from "../../config/index.js";
import { startRound } from "../../game/roundOrchestrator.js";

/**
 * Full Lobby + Multiplayer Synchronization logic. Room creation/join
 * were filled in during the Lobby milestone; this milestone adds
 * reconnect-token handling and grace-period disconnect recovery.
 */
export function registerRoomHandlers(io: AppServer, socket: AppSocket, roomManager: RoomManager) {
  socket.on("room:create", () => {
    const room = roomManager.create();
    const { player: _player, reconnectToken } = room.addPlayer(socket.id)!;
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.emit("room:created", { roomId: room.id });
    socket.emit("room:joined", { roomId: room.id, players: room.players, reconnectToken });
  });

  socket.on("room:join", ({ roomId, reconnectToken }) => {
    const room = roomManager.get(roomId);
    if (!room) {
      socket.emit("room:notFound", { reason: "That room doesn't exist or has expired." });
      return;
    }

    // Reconnect path: a token proves this socket previously held a slot
    // in this room (even under a different, now-stale socket.id — e.g.
    // after a full page refresh). Server-authoritative: the client only
    // presents a token, the server alone decides whether it's valid.
    if (reconnectToken) {
      const reconnected = room.reconnect(reconnectToken, socket.id);
      if (reconnected) {
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.emit("room:joined", { roomId, players: room.players, reconnectToken });
        io.to(roomId).emit("room:playersUpdated", { players: room.players });
        return;
      }
      // Invalid/expired token — fall through to a normal join attempt
      // rather than hard-failing, so a stale token never strands someone
      // who could otherwise still join normally.
    }

    // Idempotent: covers arriving from Create, arriving from Join, and
    // opening a shared link directly in a fresh tab, all through one
    // code path.
    const wasAlreadyMember = room.players.some((p) => p.socketId === socket.id);
    const result = room.addPlayer(socket.id);

    if (!result) {
      socket.emit("room:full", { reason: "This room already has two players." });
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.emit("room:joined", {
      roomId,
      players: room.players,
      reconnectToken: result.reconnectToken,
    });

    if (!wasAlreadyMember) {
      socket.to(roomId).emit("room:playerJoined", { player: result.player });
      io.to(roomId).emit("room:playersUpdated", { players: room.players });
    }
  });

  socket.on("room:ready", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomManager.get(roomId);
    if (!room) return;

    room.toggleReady(socket.id);

    if (room.canStartMatch()) {
      io.to(roomId).emit("match:bothReady");
      startRound(io, room, roomId);
      // Broadcast AFTER beginCountdown (inside startRound): it resets
      // both players' ready flags as part of starting the round, and
      // that's the state clients should actually see — broadcasting
      // before would show a stale ready:true that's already consumed.
      io.to(roomId).emit("room:playersUpdated", { players: room.players });
    } else {
      io.to(roomId).emit("room:playersUpdated", { players: room.players });
    }
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomManager.get(roomId);
    if (!room) return;

    const player = room.markDisconnected(socket.id);
    if (!player) return;

    // A disconnect mid-countdown must stop it immediately — otherwise
    // the server-owned timer keeps running toward a gesture window with
    // a player who isn't there anymore. Revert to READY_CHECK so both
    // players have to explicitly re-ready once reconnected, rather than
    // silently resuming a countdown that no longer means what it did.
    if (room.phase === "COUNTDOWN") {
      room.cancelCountdown();
      room.phase = "READY_CHECK";
    }

    // Let the opponent see "reconnecting" immediately, rather than an
    // abrupt disappearance — the actual removal is deferred below.
    io.to(roomId).emit("room:playersUpdated", { players: room.players });

    room.scheduleRemoval(player.id, config.reconnectGraceMs, () => {
      if (room.isEmpty()) {
        roomManager.delete(roomId);
        return;
      }
      // Host promotion (if the departing player was host) already
      // happened inside Room.scheduleRemoval's expiry callback — the
      // broadcast below reflects the post-promotion roster.
      io.to(roomId).emit("room:playerLeft");
      io.to(roomId).emit("room:playersUpdated", { players: room.players });
    });
  });
}
