import { useNavigate } from "react-router-dom";
import { ErrorState } from "@/shared/components/ErrorState";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <ErrorState
        variant="fullPanel"
        message="This page doesn't exist. Head back and start or join a room."
        actionLabel="Back to Home"
        onAction={() => navigate("/")}
      />
    </main>
  );
}
