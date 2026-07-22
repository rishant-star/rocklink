import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ParticleField } from "@/shared/components/ParticleField";
import { Providers } from "./providers";
import { ErrorBoundary } from "./ErrorBoundary";
// Side-effect import: establishes the socket connection at app load,
// regardless of which route is entered first. Without this, a direct
// link to /room/:roomId would skip HomePage's import graph entirely
// (Lobby/Match are lazy-loaded) and the socket would never connect.
import "@/shared/services/socket/socketClient";

export function App() {
  return (
    <Providers>
      <ErrorBoundary>
        <ParticleField />
        <RouterProvider router={router} />
      </ErrorBoundary>
    </Providers>
  );
}
