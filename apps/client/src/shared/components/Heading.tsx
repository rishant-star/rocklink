import { ElementType, HTMLAttributes } from "react";

type Level = "xl" | "lg" | "md";

const levelClass: Record<Level, string> = {
  xl: "text-display-xl font-bold tracking-tight",
  lg: "text-display-lg font-semibold tracking-tight",
  md: "text-display-md font-semibold",
};

const levelTag: Record<Level, ElementType> = {
  xl: "h1",
  lg: "h1",
  md: "h2",
};

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: Level;
  /** Override the semantic tag independently of visual size (e.g. an h2 styled at xl size). */
  as?: ElementType;
}

/**
 * Originally enforced a strict Space Grotesk (display) / Inter (body)
 * split per an earlier Design-System.md revision. The current design
 * uses a single typeface (Inter) throughout — see tailwind.config.ts —
 * but this component still exists so heading size/weight/tracking stay
 * centralized instead of every call site repeating them.
 */
export function Heading({ level = "lg", as, className = "", children, ...rest }: HeadingProps) {
  const Tag = as ?? levelTag[level];
  return (
    <Tag className={["font-display", levelClass[level], className].join(" ")} {...rest}>
      {children}
    </Tag>
  );
}
