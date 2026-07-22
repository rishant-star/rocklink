import { HTMLAttributes } from "react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl";

const maxWidthClass: Record<MaxWidth, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: MaxWidth;
}

/**
 * Structural-only layout primitive: centers content and applies a
 * responsive max-width + horizontal padding. Carries no visual identity
 * (no color, glow, or border) — that's what GlassPanel is for. This is
 * purely about layout, per Blueprint/Design-System's separation of
 * layout concerns from visual components.
 */
export function Container({ maxWidth = "lg", className = "", children, ...rest }: ContainerProps) {
  return (
    <div className={["mx-auto w-full px-4 sm:px-6", maxWidthClass[maxWidth], className].join(" ")} {...rest}>
      {children}
    </div>
  );
}
