import { useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Center } from "@/shared/components/layout/Center";
import { Container } from "@/shared/components/layout/Container";
import { Stack } from "@/shared/components/layout/Stack";
import { Heading } from "@/shared/components/Heading";
import { Text } from "@/shared/components/Text";
import { ErrorState } from "@/shared/components/ErrorState";
import { SkeletonPanel } from "@/shared/components/Skeleton";
import { useLobbySocket } from "./hooks/useLobbySocket";
import { PlayerSlot } from "./components/PlayerSlot";
import { ReadyToggle } from "./components/ReadyToggle";
import { ShareLinkPanel } from "./components/ShareLinkPanel";

export function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  return (
    <LobbyContent
      roomId={roomId}
      onBackHome={() => navigate("/")}
      onMatchStarting={() => navigate(`/room/${roomId}/match`)}
    />
  );
}

function LobbyContent({
  roomId,
  onBackHome,
  onMatchStarting,
}: {
  roomId: string;
  onBackHome: () => void;
  onMatchStarting: () => void;
}) {
  const { self, opponent, status, reason, opponentLeft, matchStarting, toggleReady } =
    useLobbySocket(roomId);

  // Navigating from an effect (not inline during render) since this is a
  // side effect triggered by a server event, not a derived render value.
  useEffect(() => {
    if (matchStarting) onMatchStarting();
  }, [matchStarting, onMatchStarting]);

  if (status === "notFound" || status === "full") {
    return (
      <Center className="px-4">
        <ErrorState
          variant="fullPanel"
          message={reason ?? "This room isn't available."}
          actionLabel="Back to Home"
          onAction={onBackHome}
        />
      </Center>
    );
  }

  if (status === "joining" || matchStarting) {
    return (
      <Center className="px-4 py-16 sm:px-6">
        <Container maxWidth="sm">
          <SkeletonPanel height="320px" />
        </Container>
      </Center>
    );
  }

  const roomStatus = !opponent
    ? "Waiting for opponent to join…"
    : self?.ready && opponent.ready
      ? "Both players ready — get ready to play!"
      : "Waiting for both players to be ready…";

  return (
    <Center className="px-4 py-16 sm:px-6">
      <Container maxWidth="md">
        <Stack gap={6}>
          <div className="text-center">
            <Text size="caption" tone="muted" className="normal-case tracking-normal">
              Room
            </Text>
            <Heading level="md" as="h1">
              {roomId}
            </Heading>
          </div>

          <ShareLinkPanel roomId={roomId} />

          {opponentLeft && (
            <ErrorState variant="inline" message="Your opponent left the room." />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PlayerSlot player={self} role={self?.id === "p1" ? "host" : "guest"} isSelf />
            <PlayerSlot
              player={opponent}
              role={opponent?.id === "p1" ? "host" : "guest"}
              isSelf={false}
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <Text size="caption" tone="muted" className="normal-case tracking-normal">
              {roomStatus}
            </Text>
            <ReadyToggle ready={self?.ready ?? false} onToggle={toggleReady} disabled={!self} />
          </div>
        </Stack>
      </Container>
    </Center>
  );
}
