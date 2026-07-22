import type { MatchResult, Score } from "@rocklink/shared-types";

export type BestOf = 3 | 5;

export function winsNeeded(bestOf: BestOf): number {
  return Math.floor(bestOf / 2) + 1;
}

export function scoreRound(score: Score, result: MatchResult): Score {
  const next = { ...score };
  if (result.winner === "p1") next.p1 += 1;
  if (result.winner === "p2") next.p2 += 1;
  return next;
}

export function isSeriesComplete(score: Score, bestOf: BestOf): boolean {
  const required = winsNeeded(bestOf);
  return score.p1 >= required || score.p2 >= required;
}
