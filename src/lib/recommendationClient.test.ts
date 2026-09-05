import { afterEach, describe, expect, test, vi } from "vitest";
import { RecommendationClient } from "@/lib/recommendationClient";
import { createPerformanceFixture } from "../../scripts/performance/fixtures";
import type { RecommendationJobResult } from "@/lib/recommendationJob";
import type { MovieStateMap } from "@/types";

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = [];
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { super(); FakeWorker.instances.push(this); }
}
const result: RecommendationJobResult = {
  profile: { ratedCount: 1, watchedCount: 1, averageRating: 5, topGenres: [], topTags: [] },
  recommendations: [], sections: [],
};
afterEach(() => { vi.unstubAllGlobals(); FakeWorker.instances = []; });

describe("recommendation worker scheduling", () => {
  test("coalesces rapid edits and transfers the unchanged catalog only once", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const client = new RecommendationClient();
    const worker = FakeWorker.instances[0];
    const job = { ...createPerformanceFixture(1000, 100), minimumMovieYear: null };
    const first = client.request(job).catch((error: Error) => error.message);
    const superseded = client.request({ ...job, minimumMovieYear: 1990 }).catch((error: Error) => error.message);
    const latest = client.request({ ...job, minimumMovieYear: 2000 });
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(await superseded).toContain("superseded");
    worker.dispatchEvent(new MessageEvent("message", { data: { requestId: 1, result } }));
    expect(await first).toContain("superseded");
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
    expect(worker.postMessage.mock.calls[1][0]).toMatchObject({ requestId: 3, minimumMovieYear: 2000, movies: undefined, model: undefined, modelChanged: false });
    worker.dispatchEvent(new MessageEvent("message", { data: { requestId: 3, result } }));
    expect(await latest).toEqual(result);
    client.dispose();
  });

  test("sends a changed catalog and model after skipped updates", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const client = new RecommendationClient();
    const worker = FakeWorker.instances[0];
    const initial = { ...createPerformanceFixture(10, 5), minimumMovieYear: null };
    const expanded = { ...createPerformanceFixture(20, 10), minimumMovieYear: null };
    const first = client.request(initial).catch(() => undefined);
    const skipped = client.request(expanded).catch(() => undefined);
    const latest = client.request({ ...expanded, minimumMovieYear: 2000 });
    worker.dispatchEvent(new MessageEvent("message", { data: { requestId: 1, result } }));
    expect(worker.postMessage.mock.calls[1][0]).toMatchObject({ movies: expanded.movies, model: expanded.model, modelChanged: true });
    worker.dispatchEvent(new MessageEvent("message", { data: { requestId: 3, result } }));
    await Promise.all([first, skipped, latest]);
    client.dispose();
  });

  test("rejects pending work and terminates on failure or unmount", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const client = new RecommendationClient();
    const worker = FakeWorker.instances[0];
    const job = { ...createPerformanceFixture(10, 5), minimumMovieYear: null };
    const active = client.request(job).catch((error: Error) => error.message);
    const queued = client.request(job).catch((error: Error) => error.message);
    worker.dispatchEvent(new Event("error"));
    expect(await active).toContain("stopped");
    expect(await queued).toContain("stopped");
    expect(worker.terminate).toHaveBeenCalledOnce();
    await expect(client.request(job)).rejects.toThrow("unavailable");
  });

  test("sends only edited and removed states after initial profile transfer", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const client = new RecommendationClient();
    const worker = FakeWorker.instances[0];
    const job = { ...createPerformanceFixture(1000, 500), minimumMovieYear: null };
    const initial = client.request(job);
    worker.dispatchEvent(new MessageEvent("message", { data: { requestId: 1, result } }));
    await initial;
    const states: MovieStateMap = { ...job.states, "synthetic-1": { ...job.states["synthetic-1"], ignored: true } };
    delete states["synthetic-2"];
    const update = client.request({ ...job, states });
    expect(worker.postMessage.mock.calls[1][0]).toMatchObject({
      replaceStates: false,
      removedMovieIds: ["synthetic-2"],
      states: { "synthetic-1": states["synthetic-1"] },
    });
    expect(Object.keys(worker.postMessage.mock.calls[1][0].states)).toHaveLength(1);
    worker.dispatchEvent(new MessageEvent("message", { data: { requestId: 2, result } }));
    await update;
    const reset = client.request({ ...job, states: {} });
    expect(worker.postMessage.mock.calls[2][0].removedMovieIds).toHaveLength(499);
    worker.dispatchEvent(new MessageEvent("message", { data: { requestId: 3, result } }));
    await reset;
    client.dispose();
  });
});
