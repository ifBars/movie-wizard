import { useMemo, useRef, useState } from "react";
import { useExternalSyncEffect, useMountEffect } from "@/hooks/useExternalSyncEffect";
import { RecommendationClient } from "@/lib/recommendationClient";
import type { RecommendationJob, RecommendationJobResult } from "@/lib/recommendationJob";
import type { DiscoverSection } from "@/lib/discoverSections";
import type { Recommendation, TasteProfile } from "@/types";

const emptyProfile: TasteProfile = { ratedCount: 0, watchedCount: 0, averageRating: 0, topGenres: [], topTags: [] };

export function useRecommendations(job: RecommendationJob) {
  const client = useRef<RecommendationClient | null>(null);
  const [completed, setCompleted] = useState<{ job: RecommendationJob; result: RecommendationJobResult }>();
  const [error, setError] = useState<{ job: RecommendationJob; message: string }>();

  useMountEffect(() => () => {
    client.current?.dispose();
    client.current = null;
  });

  useExternalSyncEffect(() => {
    let current = true;
    try {
      client.current ??= new RecommendationClient();
      void client.current.request(job).then((result) => {
        if (current) setCompleted({ job, result });
      }).catch((reason: unknown) => {
        if (current) setError({ job, message: reason instanceof Error ? reason.message : "Recommendations unavailable" });
      });
    } catch (reason: unknown) {
      setError({ job, message: reason instanceof Error ? reason.message : "Recommendations unavailable" });
    }
    return () => { current = false; };
  }, [job]);

  const moviesById = useMemo(() => new Map(job.movies.map((movie) => [movie.id, movie])), [job.movies]);
  const data = useMemo(() => {
    const recommendations: Recommendation[] = [];
    const discoverSections: DiscoverSection[] = [];
    if (!completed) return { recommendations, discoverSections };
    // Keep showing the previous picks while a refreshed job runs so the page doesn't unmount and lose scroll.
    // Resolving through the current job's movies drops titles hidden by new filters; dismissed titles drop immediately.
    const isStale = completed.job !== job;
    const resolveMovie = (movieId: string) => {
      if (isStale && job.states[movieId]?.ignored) return undefined;
      return moviesById.get(movieId);
    };
    for (const { movieId, ...recommendation } of completed.result.recommendations) {
      const movie = resolveMovie(movieId);
      if (movie) recommendations.push({ ...recommendation, movie });
    }
    for (const { movieIds, ...section } of completed.result.sections) {
      const movies = movieIds.flatMap((id) => {
        const movie = resolveMovie(id);
        return movie ? [movie] : [];
      });
      if (!isStale || movies.length > 0) discoverSections.push({ ...section, movies });
    }
    return { recommendations, discoverSections };
  }, [completed, job, moviesById]);

  return {
    ...data,
    profile: completed?.result.profile ?? emptyProfile,
    // Only the first run blocks the page; later runs refresh in place.
    isRecommendationsLoading: !completed && error?.job !== job,
    isRecommendationsRefreshing: completed !== undefined && completed.job !== job,
    recommendationError: error?.job === job ? error.message : null,
  };
}
