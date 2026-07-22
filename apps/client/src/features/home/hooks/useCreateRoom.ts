import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "@/shared/services/socket/socketClient";

type CreateState = "IDLE" | "CONNECTING" | "CREATING" | "CREATED" | "ERROR";
const CONNECT_TIMEOUT_MS = 3_000;
const CREATE_TIMEOUT_MS = 5_000;

export function useCreateRoom() {
  const [status, setStatus] = useState<CreateState>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const createRoom = useCallback(async () => {
    if (status === "CONNECTING" || status === "CREATING" || status === "CREATED") return;
    setError(null);
    setStatus("CONNECTING");

    if (!(await waitForConnection())) {
      setStatus("ERROR");
      setError("Unable to connect to the game server. Please try again.");
      return;
    }

    setStatus("CREATING");
    const handleCreated = ({ roomId }: { roomId?: string }) => {
      clearTimer();
      if (!roomId) {
        setStatus("ERROR");
        setError("Invalid server response. Please try again.");
        return;
      }
      setStatus("CREATED");
      navigate(`/room/${roomId}`);
    };
    timerRef.current = setTimeout(() => {
      socket.off("room:created", handleCreated);
      setStatus("ERROR");
      setError("Room creation timed out. Please try again.");
    }, CREATE_TIMEOUT_MS);
    socket.once("room:created", handleCreated);
    socket.emit("room:create");
  }, [clearTimer, navigate, status]);

  const reset = useCallback(() => {
    clearTimer();
    setStatus("IDLE");
    setError(null);
  }, [clearTimer]);

  return { createRoom, status, error, reset, isCreating: status === "CONNECTING" || status === "CREATING" };
}

function waitForConnection(): Promise<boolean> {
  if (socket.connected) return Promise.resolve(true);
  socket.connect();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => finish(false), CONNECT_TIMEOUT_MS);
    const onConnect = () => finish(true);
    const onError = () => finish(false);
    const finish = (value: boolean) => {
      clearTimeout(timeout);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      resolve(value);
    };
    socket.once("connect", onConnect);
    socket.once("connect_error", onError);
  });
}
