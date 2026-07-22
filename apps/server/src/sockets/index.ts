import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@rocklink/shared-types";
import { config } from "../config/index.js";
import { RoomManager } from "../rooms/RoomManager.js";
import { registerRoomHandlers } from "./handlers/room.handlers.js";
import { registerMatchHandlers } from "./handlers/match.handlers.js";
import { connectionRateLimitMiddleware, createEventRateLimiter } from "./middleware/rateLimit.js";
import type { SocketData } from "./types.js";

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      cors: { origin: config.corsOrigin },
      // Smooths over very brief transport drops (e.g. a sub-second wifi
      // blip) by restoring the same socket.id and socket.data within a
      // short window — zero extra round-trip. This is separate from and
      // complementary to the app-level reconnectToken: this covers only
      // in-memory, same-page-load disruptions, while reconnectToken also
      // survives a full page refresh (which wipes this recovery state).
      connectionStateRecovery: {
        maxDisconnectionDuration: 30 * 1000,
      },
    },
  );

  const roomManager = new RoomManager();

  io.use(connectionRateLimitMiddleware);

  io.on("connection", (socket) => {
    socket.use(createEventRateLimiter());
    registerRoomHandlers(io, socket, roomManager);
    registerMatchHandlers(io, socket, roomManager);
  });

  return { io, roomManager };
}
