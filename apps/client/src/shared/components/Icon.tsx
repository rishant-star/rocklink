import { ReactNode, SVGAttributes } from "react";

type Size = "sm" | "md" | "lg";

const sizePx: Record<Size, number> = {
  sm: 16,
  md: 20,
  lg: 28,
};

interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, "width" | "height"> {
  size?: Size;
  /** Decorative by default (aria-hidden). Pass a label if the icon is the only content conveying meaning. */
  label?: string;
  children: ReactNode;
}

/**
 * Standardizes every icon in the product to the outline style, 1.5px
 * stroke weight, and currentColor inheritance specified in
 * Design-System.md Section 6, instead of each usage hand-rolling its own
 * <svg> attributes (as ErrorState previously did).
 */
export function Icon({ size = "md", label, className = "", children, ...rest }: IconProps) {
  const px = sizePx[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : "true"}
      role={label ? "img" : undefined}
      aria-label={label}
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}
