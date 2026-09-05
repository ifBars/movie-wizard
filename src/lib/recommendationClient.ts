import type { RecommendationJob, RecommendationJobResult, RecommendationWorkerResponse } from "@/lib/recommendationJob";

type PendingJob = {
  id: number;
  job: RecommendationJob;
  resolve: (result: RecommendationJobResult) => void;
  reject: (error: Error) => void;
};

// Only one job runs and one latest update waits, even during rapid rating edits.
export class RecommendationClient {
  private worker: Worker;
  private active?: PendingJob;
  private queued?: PendingJob;
  private lastMovies?: RecommendationJob["movies"];
  private lastModel?: RecommendationJob["model"];
  private lastStates?: RecommendationJob["states"];
  private nextId = 0;
  private disposed = false;

  constructor(worker = new Worker(new URL("../workers/recommendations.worker.ts", import.meta.url), { type: "module" })) {
    this.worker = worker;
    worker.addEventListener("message", ({ data }: MessageEvent<RecommendationWorkerResponse>) => {
      if (data.requestId !== this.active?.id) return;
      const active = this.active;
      this.active = undefined;
      if (this.queued) {
        active.reject(new Error("Recommendation request superseded"));
      } else if ("error" in data) {
        active.reject(new Error(data.error));
      } else {
        active.resolve(data.result);
      }
      const queued = this.queued;
      this.queued = undefined;
      if (queued) this.dispatch(queued);
    });
    worker.addEventListener("error", () => this.dispose());
  }

  request(job: RecommendationJob): Promise<RecommendationJobResult> {
    if (this.disposed) return Promise.reject(new Error("Recommendation worker unavailable"));
    return new Promise((resolve, reject) => {
      const pending = { id: ++this.nextId, job, resolve, reject };
      if (this.active) {
        this.queued?.reject(new Error("Recommendation request superseded"));
        this.queued = pending;
      } else {
        this.dispatch(pending);
      }
    });
  }

  dispose() {
    this.disposed = true;
    this.worker.terminate();
    this.active?.reject(new Error("Recommendation worker stopped"));
    this.queued?.reject(new Error("Recommendation worker stopped"));
    this.active = undefined;
    this.queued = undefined;
  }

  private dispatch(pending: PendingJob) {
    this.active = pending;
    const { movies, model, states, ...job } = pending.job;
    const stateChanges: RecommendationJob["states"] = {};
    const removedMovieIds: string[] = [];
    if (this.lastStates && states !== this.lastStates) {
      for (const id of Object.keys(states)) {
        if (states[id] !== this.lastStates[id]) stateChanges[id] = states[id];
      }
      for (const id of Object.keys(this.lastStates)) {
        if (!(id in states)) removedMovieIds.push(id);
      }
    }
    // Retain the catalog in the worker instead of cloning it for every rating.
    try {
      this.worker.postMessage({
        ...job,
        requestId: pending.id,
        movies: movies === this.lastMovies ? undefined : movies,
        model: model === this.lastModel ? undefined : model,
        modelChanged: model !== this.lastModel,
        states: this.lastStates ? stateChanges : states,
        replaceStates: this.lastStates === undefined,
        removedMovieIds,
      });
      this.lastMovies = movies;
      this.lastModel = model;
      this.lastStates = states;
    } catch (error: unknown) {
      this.active = undefined;
      pending.reject(error instanceof Error ? error : new Error("Could not send recommendation data"));
    }
  }
}
