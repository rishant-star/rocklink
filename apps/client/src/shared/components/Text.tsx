import { ElementType, HTMLAttributes } from "react";

type Size = "lg" | "md" | "caption";
type Tone = "primary" | "muted";

const sizeClass: Record<Size, string> = {
  lg: "text-body-lg",
  md: "text-body",
  caption: "text-caption uppercase tracking-wide",
};

const toneClass: Record<Tone, string> = {
  primary: "text-text-primary",
  muted: "text-text-muted",
};

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: Size;
  tone?: Tone;
  as?: ElementType;
}

/**
 * Body-copy counterpart to `Heading` — keeps Inter + the body type scale
 * as the default for every non-display text, per Design-System.md
 * Section 2.
 */
export function Text({ size = "md", tone = "primary", as = "p", className = "", children, ...rest }: TextProps) {
  const Tag = as;
  return (
    <Tag className={["font-body", sizeClass[size], toneClass[tone], className].join(" ")} {...rest}>
      {children}
    </Tag>
  );
}
