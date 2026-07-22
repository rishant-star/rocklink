import { useState } from "react";
import { GlassPanel } from "@/shared/components/GlassPanel";
import { Button } from "@/shared/components/Button";
import { Text } from "@/shared/components/Text";

export function ShareLinkPanel({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/room/${roomId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — the
      // link text is still visible and selectable, so failing silently
      // here doesn't strand the player without a way to share it.
    }
  }

  return (
    <GlassPanel
      glow="secondary"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <Text size="caption" tone="muted" className="normal-case tracking-normal">
          Invite link
        </Text>
        <Text size="md" className="truncate">
          {link}
        </Text>
      </div>
      <Button variant="ghost" onClick={handleCopy} className="w-full shrink-0 sm:w-auto">
        {copied ? "Copied!" : "Copy Link"}
      </Button>
    </GlassPanel>
  );
}
