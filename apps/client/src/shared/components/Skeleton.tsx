import { HTMLAttributes } from "react";

/**
 * Shaped loading placeholders. Per Design-System.md Section 7, no plain
 * "Loading..." text is used anywhere in the product — every async wait
 * uses one of these, sized to match the content it precedes.
 */

const shimmer =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";

interface SkeletonPanelProps extends HTMLAttributes<HTMLDivElement> {
  height?: string;
}

export function SkeletonPanel({ height = "120px", className = "", ...rest }: SkeletonPanelProps) {
  return (
    <div
      aria-hidden="true"
      className={["rounded-panel bg-glass border border-glass-border", shimmer, className].join(
        " ",
      )}
      style={{ height }}
      {...rest}
    />
  );
}

interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  size?: "caption" | "body";
}

export function SkeletonText({ width = "100%", size = "body", className = "", ...rest }: SkeletonTextProps) {
  const height = size === "caption" ? "0.8125rem" : "1rem";
  return (
    <div
      aria-hidden="true"
      className={["rounded-full bg-glass", shimmer, className].join(" ")}
      style={{ width, height }}
      {...rest}
    />
  );
}
