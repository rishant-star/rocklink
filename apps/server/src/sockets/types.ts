import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@rocklink/shared-types";

/**
 * Per-connection metadata stored on socket.data. Server-internal only —
 * not part of the client/server event contract, so it lives here rather
 * than in @rocklink/shared-types.
 */
export interface SocketData {
  roomId?: string;
}

// Shared type aliases so every handler file references the same fully-
// typed Server/Socket shape instead of each redeclaring it slightly
// differently.
export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
