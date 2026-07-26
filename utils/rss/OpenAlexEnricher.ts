import { fetch } from "ags/fetch";
import type { RssArticle } from "./types.ts";

const IMPACT_FACTOR_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // bi-weekly

async function fetchSourceImpactFactors(
  sourceIds: string[],
  seed: Map<string, number>,
): Promise<{
  impactBySourceId: Map<string, number>;
  freshlyFetched: Set<string>;
}> {
  const impactBySourceId = new Map(seed);
  const freshlyFetched = new Set<string>();
  const uncached = sourceIds.filter((id) => !impactBySourceId.has(id));
  if (uncached.length === 0) return { impactBySourceId, freshlyFetched };

  const chunks: string[][] = [];
  for (let i = 0; i < uncached.length; i += 50) {
    chunks.push(uncached.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    const idFilter = chunk
      .map((id) => id.replace("https://openalex.org/", ""))
      .join("|");
    try {
      const res = await fetch(
        `https://api.openalex.org/sources?filter=ids.openalex:${idFilter}&per-page=50`,
      );
      const data = await res.json();
      for (const source of data.results || []) {
        const impact = source.summary_stats?.["2yr_mean_citedness"];
        if (impact !== undefined) {
          impactBySourceId.set(source.id, impact);
          freshlyFetched.add(source.id);
        }
      }
    } catch (e) {
      console.error("[RssEnricher] Source lookup failed:", e);
    }
  }
  return { impactBySourceId, freshlyFetched };
}

export async function enrichBatch(items: RssArticle[]): Promise<RssArticle[]> {
  const withDois = items.filter((i) => i.doi && i.enriched === undefined);
  if (withDois.length === 0) return items;

  const now = Date.now();
  const knownImpact = new Map<string, number>();
  for (const item of items) {
    if (
      item.sourceId &&
      item.impactFactor !== undefined &&
      item.impactFactorUpdated !== undefined &&
      now - item.impactFactorUpdated < IMPACT_FACTOR_MAX_AGE_MS
    ) {
      knownImpact.set(item.sourceId, item.impactFactor);
    }
  }

  const enrichedMap = new Map<string, any>();
  const chunks: RssArticle[][] = [];
  for (let i = 0; i < withDois.length; i += 50) {
    chunks.push(withDois.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    const doiFilter = chunk.map((i) => i.doi).join("|");
    try {
      const res = await fetch(
        `https://api.openalex.org/works?filter=doi:${doiFilter}&per-page=50`,
      );
      const data = await res.json();
      for (const work of data.results || []) {
        const doi = work.doi?.replace("https://doi.org/", "");
        if (doi) enrichedMap.set(doi, work);
      }
    } catch (e) {
      console.error("[RssEnricher] OpenAlex batch enrichment failed:", e);
    }
  }

  const uniqueSourceIds = [
    ...new Set(
      Array.from(enrichedMap.values())
        .map((work) => work.primary_location?.source?.id)
        .filter(Boolean),
    ),
  ] as string[];

  const { impactBySourceId, freshlyFetched } = await fetchSourceImpactFactors(
    uniqueSourceIds,
    knownImpact,
  );

  return items.map((item) => {
    if (!item.doi || item.enriched !== undefined) return item;
    const work = enrichedMap.get(item.doi);
    if (!work) return { ...item, enriched: false };

    const sourceId = work.primary_location?.source?.id;
    const impactFactor = sourceId ? impactBySourceId.get(sourceId) : undefined;

    return {
      ...item,
      journalName: work.primary_location?.source?.display_name,
      sourceId,
      impactFactor,
      impactFactorUpdated:
        sourceId && freshlyFetched.has(sourceId)
          ? now
          : item.impactFactorUpdated,
      enriched: true,
    };
  });
}
