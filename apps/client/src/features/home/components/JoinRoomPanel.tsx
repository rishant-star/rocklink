import { FormEvent, useState } from "react";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Text } from "@/shared/components/Text";
import { useJoinRoom } from "../hooks/useJoinRoom";

export function JoinRoomPanel() {
  const [roomCode, setRoomCode] = useState("");
  const { joinRoom, isJoining, error } = useJoinRoom();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!roomCode.trim()) return;
    joinRoom(roomCode);
  }

  return (
    <GlassPanel glow="secondary" className="flex flex-col gap-3">
      <Text size="caption" tone="muted" className="normal-case tracking-normal">
        Have a room code?
      </Text>
      {/* A real <form> so Enter submits — keyboard accessibility, not
          just a click target. */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Room code"
            placeholder="e.g. 8f3a2c1d"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            error={error ?? undefined}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button type="submit" variant="ghost" disabled={isJoining || !roomCode.trim()} className="w-full sm:w-auto">
          {isJoining ? "Joining…" : "Join Room"}
        </Button>
      </form>
    </GlassPanel>
  );
}
