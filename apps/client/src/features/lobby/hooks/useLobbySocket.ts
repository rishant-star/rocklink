import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerInfo } from "@rocklink/shared-types";
import { socket } from "@/shared/services/socket/socketClient";
import { AudioManager } from "@/shared/services/audio/AudioManager";
import { useMatchStore } from "@/features/match/store/useMatchStore";

type LobbyStatus = "joining" | "joined" | "notFound" | "full";

const TOKEN_PREFIX = "rocklink:reconnectToken:";

/**
 * sessionStorage can be unavailable (private browsing, disabled storage)
 * or throw (some browser privacy modes). Reconnection continuity is a
 * resilience nicety, not a hard requirement — fail silently rather than
 * breaking the join flow over it.
 */
function getStoredToken(roomId: string): string | undefined {
  try {
    return sessionStorage.getItem(TOKEN_PREFIX + roomId) ?? undefined;
  } catch {
    return undefined;
  }
}

function storeToken(roomId: string, token: string): void {
  try {
    sessionStorage.setItem(TOKEN_PREFIX + roomId, token);
  } catch {
    // See getStoredToken above.
  }
}

/**
 * Derives this client's own PlayerId from the roster (same pattern as
 * the `self`/`opponent` derivation below) and persists it into the
 * global match store, so the Match page can read it after this hook
 * unmounts — the architectural alternative to adding a selfId field to
 * match:result. See Phase 4C notes.
 */
function persistSelfId(players: PlayerInfo[]): void {
  const self = players.find((p) => p.socketId === socket.id);
  if (self) {
    useMatchStore.getState().setSelfId(self.id);
  }
}

/**
 * Deliberately local hook state, not a Zustand store — this is page-
 * scoped, transient state (who's in this specific room right now), not
 * a cross-cutting concern like match phase or connection status.
 *
 * Rejoins on mount AND on every subsequent socket reconnect (the
 * `socket.on("connect", ...)` listener below) — a network blip that
 * reconnects the underlying socket, with either the same or a new
 * socket.id, needs to re-announce itself to the room either way. The
 * server's Room.reconnect/addPlayer handle both cases correctly given a
 * stored token.
 *
 * Release Candidate 1: also fires player.joined / player.left audio
 * cues. player.joined is edge-detected off the roster's connected-player
 * count crossing upward (announcing the *opponent* arriving, not your
 * own join — the baseline count is captured on room:joined without
 * playing anything). player.left reuses the existing handlePlayerLeft
 * handler directly, since that's already a real, one-shot event rather
 * than a derived value — not every cue fits useAudioCue's
 * value/threshold shape, and this one doesn't.
 */
export function useLobbySocket(roomId: string) {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [status, setStatus] = useState<LobbyStatus>("joining");
  const [reason, setReason] = useState<string | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [matchStarting, setMatchStarting] = useState(false);
  const prevConnectedCountRef = useRef(0);

  useEffect(() => {
    setOpponentLeft(false);
    setMatchStarting(false);
    prevConnectedCountRef.current = 0;

    function attemptJoin() {
      setStatus("joining");
      const reconnectToken = getStoredToken(roomId);
      socket.emit("room:join", { roomId, reconnectToken });
    }

    // If already connected (the common case — App.tsx connects eagerly),
    // join immediately. Otherwise the "connect" listener below will fire
    // once the connection completes. Avoids a redundant double-emit on
    // a fresh mount where the socket is already up.
    if (socket.connected) {
      attemptJoin();
    }
    socket.on("connect", attemptJoin);

    function handleJoined(payload: { roomId: string; players: PlayerInfo[]; reconnectToken: string }) {
      if (payload.roomId !== roomId) return;
      setPlayers(payload.players);
      setStatus("joined");
      storeToken(roomId, payload.reconnectToken);
      persistSelfId(payload.players);
      // Baseline only — this is our own join, not an opponent arriving.
      prevConnectedCountRef.current = payload.players.filter((p) => p.connected).length;
    }
    function handlePlayersUpdated(payload: { players: PlayerInfo[] }) {
      setPlayers(payload.players);
      persistSelfId(payload.players);
      const connectedCount = payload.players.filter((p) => p.connected).length;
      if (connectedCount > prevConnectedCountRef.current) {
        AudioManager.play("player.joined");
      }
      prevConnectedCountRef.current = connectedCount;
    }
    function handleNotFound(payload: { reason: string }) {
      setStatus("notFound");
      setReason(payload.reason);
    }
    function handleFull(payload: { reason: string }) {
      setStatus("full");
      setReason(payload.reason);
    }
    function handlePlayerLeft() {
      setOpponentLeft(true);
      AudioManager.play("player.left");
    }
    function handleBothReady() {
      setMatchStarting(true);
    }

    socket.on("room:joined", handleJoined);
    socket.on("room:playersUpdated", handlePlayersUpdated);
    socket.on("room:notFound", handleNotFound);
    socket.on("room:full", handleFull);
    socket.on("room:playerLeft", handlePlayerLeft);
    socket.on("match:bothReady", handleBothReady);

    return () => {
      socket.off("connect", attemptJoin);
      socket.off("room:joined", handleJoined);
      socket.off("room:playersUpdated", handlePlayersUpdated);
      socket.off("room:notFound", handleNotFound);
      socket.off("room:full", handleFull);
      socket.off("room:playerLeft", handlePlayerLeft);
      socket.off("match:bothReady", handleBothReady);
    };
  }, [roomId]);

  const toggleReady = useCallback(() => {
    socket.emit("room:ready");
  }, []);

  const self = players.find((p) => p.socketId === socket.id);
  const opponent = players.find((p) => p.socketId !== socket.id);

  return { players, self, opponent, status, reason, opponentLeft, matchStarting, toggleReady };
}
