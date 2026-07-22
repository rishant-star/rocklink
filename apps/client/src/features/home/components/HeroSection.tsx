import { motion } from "framer-motion";
import { Heading } from "@/shared/components/Heading";
import { Text } from "@/shared/components/Text";
import { fadeUp } from "@/shared/animations/variants";
import { CreateRoomPanel } from "./CreateRoomPanel";
import { JoinRoomPanel } from "./JoinRoomPanel";
import { PlayVsAIPanel } from "./PlayVsAIPanel";

/**
 * Asymmetric two-column hero (text left, action cards right) replacing
 * the old centered/stacked layout — matches the reference's hero
 * structure while keeping RockLink's actual entry points (Create/Join/
 * AI) as the "product" side instead of a photo.
 */
export function HeroSection() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16"
    >
      <div className="flex flex-col justify-center">
        <Text size="caption" tone="muted">
          Real-time · Gesture-based
        </Text>
        <Heading level="xl" className="mt-4">
          Play with
          <br />
          your hands.
        </Heading>
        <Text size="lg" tone="muted" className="mt-6 max-w-md">
          The Hand is the Hardware — real-time multiplayer or a local AI opponent, played entirely
          with rock, paper, and scissors gestures. No controller, nothing leaves your browser.
        </Text>
      </div>

      <div className="flex flex-col gap-8">
        <div id="multiplayer" className="flex scroll-mt-24 flex-col gap-4">
          <CreateRoomPanel />
          <JoinRoomPanel />
        </div>
        <div id="ai" className="scroll-mt-24">
          <PlayVsAIPanel />
        </div>
      </div>
    </motion.div>
  );
}
