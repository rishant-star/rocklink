import { ButtonHTMLAttributes, forwardRef, MouseEvent } from "react";
import { motion } from "framer-motion";
import { AudioManager } from "@/shared/services/audio/AudioManager";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
  > {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-bg font-semibold hover:opacity-90",
  ghost: "bg-transparent border border-glass-border text-text-primary hover:border-primary/40",
  danger: "bg-danger text-primary font-semibold hover:opacity-90",
};

/**
 * Shared Button primitive. Never hard-swaps color on hover — always a
 * glow/scale response, per Design-System.md Section 4.
 *
 * Also the single place that calls AudioManager directly (Decision 15)
 * for ui.hover/ui.click, rather than through useAudioCue — every button
 * in the app passes through this one component, so this is a deliberate
 * centralization, not scattered audio calls (see RELEASE_SIGNOFF.md
 * Deferred Improvements for the recorded open question about this
 * specific coupling). This is also where AudioManager.init() gets
 * called: it must run after a user gesture (browser autoplay policy),
 * and a button click is the first such gesture in nearly every flow.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", disabled, children, onClick, ...rest }, ref) => {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
      AudioManager.init();
      AudioManager.play("ui.click");
      onClick?.(event);
    }

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.12 }}
        onHoverStart={disabled ? undefined : () => AudioManager.play("ui.hover")}
        onClick={handleClick}
        className={[
          "min-h-[44px] rounded-panel-sm px-6 text-body transition-shadow duration-micro",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          disabled ? "cursor-not-allowed opacity-40 hover:shadow-none" : "",
          variantClasses[variant],
          className,
        ].join(" ")}
        {...rest}
      >
        {children}
      </motion.button>
    );
  },
);

Button.displayName = "Button";
