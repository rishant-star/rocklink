import { PropsWithChildren } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Composed app-level providers. Per Blueprint Section 6, match state
 * lives in Zustand (see features/match/store), NOT here — this file is
 * reserved for genuinely scoped concerns (e.g. a future ThemeContext),
 * added as they're needed.
 *
 * MotionConfig(reducedMotion="user"): makes every Framer Motion
 * animation in the app respect the OS-level reduced-motion preference.
 * CSS-driven motion already honors this via the `prefers-reduced-motion`
 * media query in tokens.css/tailwind.css — this closes the same gap for
 * JS-driven Framer Motion animation, which is most of the app's motion.
 */
export function Providers({ children }: PropsWithChildren) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
