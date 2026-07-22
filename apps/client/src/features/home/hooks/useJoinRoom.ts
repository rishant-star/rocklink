import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "@/shared/services/socket/socketClient";

export function useJoinRoom() {
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinRoom = useCallback((roomId: string) => {
    setError(null);
    setIsJoining(true);
    socket.emit("room:join", { roomId: roomId.trim() });
  }, []);

  useEffect(() => {
    function handleJoined({ roomId }: { roomId: string }) {
      setIsJoining(false);
      navigate(`/room/${roomId}`);
    }
    function handleRejected({ reason }: { reason: string }) {
      setIsJoining(false);
      setError(reason);
    }
    socket.on("room:joined", handleJoined);
    socket.on("room:notFound", handleRejected);
    socket.on("room:full", handleRejected);
    return () => {
      socket.off("room:joined", handleJoined);
      socket.off("room:notFound", handleRejected);
      socket.off("room:full", handleRejected);
    };
  }, [navigate]);

  return { joinRoom, isJoining, error };
}
