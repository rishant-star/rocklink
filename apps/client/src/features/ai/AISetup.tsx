import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Center } from "@/shared/components/layout/Center";
import { Container } from "@/shared/components/layout/Container";
import { Stack } from "@/shared/components/layout/Stack";
import { Heading } from "@/shared/components/Heading";
import { Text } from "@/shared/components/Text";
import { Button } from "@/shared/components/Button";
import { fadeUp } from "@/shared/animations/variants";
import { DifficultySelector } from "./components/DifficultySelector";
import { MatchLengthSelector } from "./components/MatchLengthSelector";
import type { AIDifficulty } from "./services/Difficulty";
import type { BestOf } from "./services/series";

interface AISetupProps {
  onStart: (difficulty: AIDifficulty, bestOf: BestOf) => void;
}

/**
 * Mirrors HomePage's centered, narrow-column layout (Container maxWidth
 * "sm") rather than inventing a new page shape — Player vs AI is a
 * peer game mode to Multiplayer, not a different product.
 */
export function AISetup({ onStart }: AISetupProps) {
  const [difficulty, setDifficulty] = useState<AIDifficulty | null>(null);
  const [bestOf, setBestOf] = useState<BestOf>(3);

  return (
    <Center className="px-4 py-16 sm:px-6">
      <Container maxWidth="sm">
        <Stack gap={8}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="text-center">
            <Heading level="xl">Play vs AI</Heading>
            <Text size="lg" tone="muted" className="mt-3">
              No opponent required. Pick a difficulty and go.
            </Text>
          </motion.div>

          <Stack gap={4}>
            <Text size="caption" tone="muted" className="normal-case tracking-normal">
              Select difficulty
            </Text>
            <DifficultySelector value={difficulty} onChange={setDifficulty} />
          </Stack>

          <Stack gap={4}>
            <Text size="caption" tone="muted" className="normal-case tracking-normal">
              Match length
            </Text>
            <MatchLengthSelector value={bestOf} onChange={setBestOf} />
          </Stack>

          <Stack gap={3} align="center">
            <Button
              variant="primary"
              disabled={!difficulty}
              onClick={() => difficulty && onStart(difficulty, bestOf)}
              className="w-full sm:w-auto"
            >
              Start Match
            </Button>
            <Link to="/">
              <Text size="caption" tone="muted" className="normal-case tracking-normal underline underline-offset-4">
                Back to Home
              </Text>
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Center>
  );
}
