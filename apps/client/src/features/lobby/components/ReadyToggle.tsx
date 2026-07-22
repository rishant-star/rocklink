import { Button } from "@/shared/components/Button";

interface ReadyToggleProps {
  ready: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ReadyToggle({ ready, onToggle, disabled }: ReadyToggleProps) {
  return (
    <Button variant={ready ? "ghost" : "primary"} onClick={onToggle} disabled={disabled} aria-pressed={ready}>
      {ready ? "Not Ready" : "I'm Ready"}
    </Button>
  );
}
