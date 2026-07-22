import { HTMLAttributes } from "react";

interface CenterProps extends HTMLAttributes<HTMLDivElement> {
  minHeightScreen?: boolean;
}

/**
 * Centers a single block of content on both axes. Replaces the repeated
 * `flex min-h-screen flex-col items-center justify-center` pattern
 * already duplicated across HomePage/LobbyPage/MatchPage — available now
 * for any new page; adopting it on the existing three is a follow-up,
 * not part of this token-only phase.
 */
export function Center({ minHeightScreen = true, className = "", children, ...rest }: CenterProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center",
        minHeightScreen ? "min-h-screen" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
