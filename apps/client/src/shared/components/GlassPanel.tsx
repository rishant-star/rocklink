import { CSSProperties, HTMLAttributes, forwardRef } from "react";

type Glow = "primary" | "secondary" | "accent" | "none";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  glow?: Glow;
  elevated?: boolean;
  /**
   * 1px gradient border cycling between primary/secondary (unchanged
   * mechanism — see tailwind.css's .glass-gradient-border — now
   * rendered in the new muted palette automatically, since it reads
   * --color-primary/--color-secondary from tokens.css rather than
   * hardcoding the old neon values). Still opt-in, still meant for
   * primary panels only, not every card.
   */
  gradientBorder?: boolean;
}

// Differentiates panel "glow" via border color/opacity rather than a
// colored shadow blur — the flat, editorial surface this redesign uses
// has no glassmorphic halo to blur in the first place. `none` is a
// slightly dimmer neutral border than the three semantic variants.
const glowBorderClass: Record<Glow, string> = {
  primary: "border-primary/35",
  secondary: "border-secondary/35",
  accent: "border-accent/45",
  none: "border-glass-border",
};

/**
 * Base surface used everywhere in the product. Previously a
 * translucent, blurred "glass" card (see git history / earlier
 * Design-System.md revisions); now a flat, opaque, thin-bordered
 * surface — no backdrop-blur, no glow shadow — matching the minimal
 * reference this was redesigned against. Kept the same name/prop API
 * (`glow`, `elevated`, `gradientBorder`) so none of its ~15 call sites
 * across Match/Lobby/AI/Home needed to change.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      glow = "none",
      elevated = false,
      gradientBorder = false,
      className = "",
      style,
      children,
      ...rest
    },
    ref,
  ) => {
    const computedStyle =
      gradientBorder && elevated
        ? ({ "--glass-panel-fill": "var(--color-bg-elevated)", ...style } as CSSProperties)
        : style;

    return (
      <div
        ref={ref}
        style={computedStyle}
        className={[
          "relative rounded-panel shadow-panel",
          gradientBorder ? "glass-gradient-border animate-border-glow" : "border bg-glass",
          !gradientBorder ? glowBorderClass[glow] : "",
          elevated && !gradientBorder ? "bg-bg-elevated" : "",
          "p-6",
          className,
        ].join(" ")}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

GlassPanel.displayName = "GlassPanel";
