import { GlassPanel } from "./GlassPanel";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";

interface ErrorStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "inline" | "fullPanel";
}

/**
 * Single reusable error surface for the whole product. Per Design-System.md
 * Section 7, no bare alert() or unstyled error text is used anywhere —
 * every failure (room not found, camera denied, disconnects, etc.) routes
 * through this component.
 *
 * Copy convention: state what happened and what to do next, in the
 * interface's voice. Never a raw exception message.
 */
export function ErrorState({
  message,
  actionLabel,
  onAction,
  variant = "inline",
}: ErrorStateProps) {
  const content = (
    <div className="flex flex-col items-start gap-3" role="status" aria-live="polite">
      <Icon size="lg" className="text-danger">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <circle cx="12" cy="16" r="0.5" fill="currentColor" />
      </Icon>
      <Text>{message}</Text>
      {actionLabel && onAction && (
        <Button variant="ghost" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (variant === "fullPanel") {
    return (
      <GlassPanel glow="none" className="mx-auto max-w-md">
        {content}
      </GlassPanel>
    );
  }

  return <div className="rounded-panel-sm border border-glass-border bg-glass p-4">{content}</div>;
}
