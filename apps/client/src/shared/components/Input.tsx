import { InputHTMLAttributes, forwardRef, useId } from "react";
import { ErrorState } from "./ErrorState";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Glass-styled text input. No detailed input spec exists yet in
 * Design-System.md beyond "Inter for form inputs" (Section 2) — this
 * follows the same glass/border/focus-ring language as GlassPanel and
 * Button so it doesn't introduce a third visual dialect. Built now
 * because Phase 2B names it explicitly and the product will need one
 * shortly for room-code entry on the Join Room flow.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={inputId}
            className="font-body text-caption uppercase tracking-wide text-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={[
            "min-h-[44px] rounded-panel-sm border bg-glass px-4 text-body text-text-primary",
            "placeholder:text-text-muted backdrop-blur-panel",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            error ? "border-danger" : "border-glass-border",
            className,
          ].join(" ")}
          {...rest}
        />
        {error && (
          <div id={`${inputId}-error`}>
            <ErrorState variant="inline" message={error} />
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
