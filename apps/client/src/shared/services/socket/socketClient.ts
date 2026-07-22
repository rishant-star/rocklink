import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@rocklink/shared-types";
import { useConnectionStore } from "./useConnectionStore";

// On a phone, localhost means the phone itself. Using the page host by
// default makes a LAN page connect back to the PC that served it.
const SERVER_URL = "/";

// Socket<ListenEvents, EmitEvents> — from the client's perspective it
// listens for ServerToClientEvents and emits ClientToServerEvents (the
// mirror image of the server's own Server<...> typing).
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  path: "/socket.io",
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => useConnectionStore.getState().setStatus("connected"));
socket.on("disconnect", () => useConnectionStore.getState().setStatus("disconnected"));
socket.io.on("open", () => useConnectionStore.getState().setStatus("connecting"));
socket.on("connect_error", () => useConnectionStore.getState().setStatus("failed"));
socket.io.on("reconnect_attempt", () => useConnectionStore.getState().setStatus("reconnecting"));
socket.io.on("reconnect", () => useConnectionStore.getState().setStatus("connected"));
