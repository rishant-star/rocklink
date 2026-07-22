import { HTMLAttributes } from "react";

type Gap = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24;
type Align = "start" | "center" | "end" | "stretch";

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  align?: Align;
}

const alignClass: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

// Tailwind's JIT scanner needs literal class strings present in source —
// building "gap-${gap}" dynamically means it never gets generated. This
// lookup map is what makes the gap prop actually work.
const gapClass: Record<Gap, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  12: "gap-12",
  16: "gap-16",
  24: "gap-24",
};

/**
 * Vertical flex layout primitive. `gap` maps directly to the spacing
 * scale (Design-System.md Section 3) so vertical rhythm stays consistent
 * without every feature reaching for an arbitrary gap value.
 */
export function Stack({ gap = 4, align = "stretch", className = "", children, ...rest }: StackProps) {
  return (
    <div className={["flex flex-col", gapClass[gap], alignClass[align], className].join(" ")} {...rest}>
      {children}
    </div>
  );
}
