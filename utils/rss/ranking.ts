import { RssArticle } from "./types.ts";

export interface RankedResult<T extends RssArticle = RssArticle> {
  item: T;
  relevanceScore: number;
  impactScore: number;
  combinedScore: number;
}

export function rankResults<T extends RssArticle>(
  fuseResults: { item: T; score?: number }[],
  impactWeight: number,
  maxObservedImpact: number,
): RankedResult<T>[] {
  const relevanceWeight = 1 - impactWeight;

  return fuseResults
    .map(({ item, score = 0 }) => {
      const relevanceScore = 1 - score;

      const impactScore = item.impactFactor
        ? Math.log(1 + item.impactFactor) / Math.log(1 + maxObservedImpact)
        : 0;

      const combinedScore =
        relevanceScore * relevanceWeight + impactScore * impactWeight;

      return { item, relevanceScore, impactScore, combinedScore };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}
