import { HTMLAttributes } from "react";

type Gap = 1 | 2 | 3 | 4 | 6 | 8 | 12;
type Justify = "start" | "center" | "end" | "between";

interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  justify?: Justify;
}

const gapClass: Record<Gap, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  12: "gap-12",
};

const justifyClass: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

/**
 * Horizontal, wrapping flex layout primitive — for rows of items (e.g.
 * badges, inline actions) that should wrap gracefully on narrow
 * viewports instead of overflowing.
 */
export function Cluster({
  gap = 4,
  justify = "start",
  className = "",
  children,
  ...rest
}: ClusterProps) {
  return (
    <div
      className={["flex flex-wrap items-center", gapClass[gap], justifyClass[justify], className].join(
        " ",
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
