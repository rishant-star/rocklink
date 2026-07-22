import { createBrowserRouter, Outlet, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HomePage } from "@/features/home/HomePage";
import { SkeletonPanel } from "@/shared/components/Skeleton";
import { ConnectionStatusBadge } from "@/shared/components/ConnectionStatusBadge";
import { fadeUp } from "@/shared/animations/variants";

// MatchPage pulls in the gesture-detection feature (MediaPipe), so it's
// lazy-loaded here rather than in the eager route bundle.
// See Blueprint Section 14 (Performance).
const LobbyPage = lazy(() =>
  import("@/features/lobby/LobbyPage").then((m) => ({ default: m.LobbyPage })),
);
const MatchPage = lazy(() =>
  import("@/features/match/MatchPage").then((m) => ({ default: m.MatchPage })),
);
// Also pulls in gesture-detection (MediaPipe) via GestureCalibrationStage,
// so it gets the same lazy treatment as MatchPage.
const AIPage = lazy(() => import("@/features/ai/AIPage").then((m) => ({ default: m.AIPage })));
const NotFoundPage = lazy(() =>
  import("@/features/home/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <SkeletonPanel height="240px" className="w-full max-w-lg" />
    </div>
  );
}

/**
 * Pathless layout route. AnimatePresence needs a stable element keyed
 * on the route to animate between pages — this is that anchor. Reuses
 * the existing `fadeUp` variant rather than introducing a new motion
 * primitive, so premium page transitions are "free" everywhere,
 * including pages built in later phases.
 */
function RootLayout() {
  const location = useLocation();
  return (
    <>
      <ConnectionStatusBadge pathname={location.pathname} />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      {
        path: "/ai",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <AIPage />
          </Suspense>
        ),
      },
      {
        path: "/room/:roomId",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <LobbyPage />
          </Suspense>
        ),
      },
      {
        path: "/room/:roomId/match",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <MatchPage />
          </Suspense>
        ),
      },
      {
        path: "*",
        element: (
          <Suspense fallback={<RouteFallback />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);
