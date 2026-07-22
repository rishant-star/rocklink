import { create } from "zustand";

export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "disconnected" | "failed";

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

/**
 * Tracks this client's own socket link to the server. Deliberately
 * separate from match state (useMatchStore) — connection status is
 * relevant on the Home page before any room exists, whereas match state
 * only makes sense once a match is underway. Written to directly from
 * socketClient.ts's connection event listeners, which run outside any
 * React component (Zustand's getState()/setState() support this).
 */
export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "disconnected",
  setStatus: (status) => set({ status }),
}));
