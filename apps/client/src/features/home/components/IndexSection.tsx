import { Text } from "@/shared/components/Text";
import { CameraReadinessCard } from "./CameraReadinessCard";

const items = [
  {
    number: "01",
    title: "Player vs Player",
    detail: "Create a room, share the link, play in real time over WebSockets.",
  },
  {
    number: "02",
    title: "Player vs AI",
    detail: "Four difficulties, from pure chance to an opponent that learns your patterns.",
  },
  {
    number: "03",
    title: "Gesture detection",
    detail: "MediaPipe hand tracking, running entirely on-device in your browser.",
  },
];

/**
 * Numbered index list (left) + a single supporting card (right) —
 * reference's lower two-column info block, adapted to RockLink's three
 * actual pillars instead of product features.
 */
export function IndexSection() {
  return (
    <div
      id="camera"
      className="grid scroll-mt-24 grid-cols-1 gap-12 border-t border-glass-border py-16 sm:py-24 lg:grid-cols-2 lg:gap-16"
    >
      <ul className="flex flex-col gap-8">
        {items.map((item) => (
          <li key={item.number} className="flex gap-6">
            <Text size="caption" tone="muted" className="pt-1">
              {item.number}
            </Text>
            <div>
              <Text size="md" className="font-medium">
                {item.title}
              </Text>
              <Text size="caption" tone="muted" className="mt-1 max-w-sm normal-case tracking-normal">
                {item.detail}
              </Text>
            </div>
          </li>
        ))}
      </ul>
      <CameraReadinessCard />
    </div>
  );
}
