import type { Gesture } from "@rocklink/shared-types";

export type AIDifficulty = "EASY" | "NORMAL" | "HARD" | "ADAPTIVE";

export interface DifficultyConfig {
  id: AIDifficulty;
  label: string;
  description: string;
  /** Short chip copy shown on the difficulty badge during a match. */
  badge: string;
}

/**
 * All four selectable AI opponents. DifficultySelector renders this
 * list directly rather than hardcoding options in JSX, and AIEngine
 * switches on `id` — this is the single place both sides read from.
 */
export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: "EASY",
    label: "Easy",
    badge: "EASY",
    description: "Pure chance — every throw is an equal-probability coin flip.",
  },
  {
    id: "NORMAL",
    label: "Normal",
    badge: "NORMAL",
    description: "Mostly unpredictable, with an occasional read on your last move.",
  },
  {
    id: "HARD",
    label: "Hard",
    badge: "HARD",
    description: "Counters your last throw most of the time. Still slips up occasionally.",
  },
  {
    id: "ADAPTIVE",
    label: "Adaptive",
    badge: "ADAPTIVE",
    description: "Learns your habits over the match and counters your patterns.",
  },
];

export const GESTURES: Gesture[] = ["ROCK", "PAPER", "SCISSORS"];
