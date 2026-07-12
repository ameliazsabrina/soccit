import { describe, expect, it } from "vitest";
import { runSupervisor, type SupervisorDeps } from "./supervisor.js";
import type { LeaderboardStore } from "./store/leaderboard.js";
import type { PredictionSource } from "./onchain/predictions.js";

// redis/store/predictions are never touched when `project` is injected.
const stub = {
  redis: {} as never,
  store: {} as unknown as LeaderboardStore,
  predictions: {} as unknown as PredictionSource,
};

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function base(over: Partial<SupervisorDeps>): SupervisorDeps {
  return {
    ...stub,
    discover: async () => [],
    pollIntervalMs: 1,
    signal: new AbortController().signal,
    wait: flush,
    ...over,
  };
}

describe("runSupervisor", () => {
  it("spawns one projector per discovered fixture and never double-spawns an active one", async () => {
    const controller = new AbortController();
    const started: number[] = [];
    const gates: Array<() => void> = [];
    const project = (fixtureId: number) => {
      started.push(fixtureId);
      return new Promise<void>((resolve) => gates.push(resolve)); // stays active
    };
    let polls = 0;
    const discover = async () => {
      polls += 1;
      if (polls === 1) return [1, 2];
      if (polls === 2) return [1, 2, 3]; // 1,2 still active → only 3 is new
      controller.abort();
      return [];
    };

    await runSupervisor(base({ discover, project, signal: controller.signal }));

    expect(started).toEqual([1, 2, 3]);
  });

  it("does not respawn a fixture that already completed (terminal)", async () => {
    const controller = new AbortController();
    const started: number[] = [];
    const project = async (fixtureId: number) => {
      started.push(fixtureId); // resolves immediately = reached terminal
    };
    let polls = 0;
    const discover = async () => {
      polls += 1;
      if (polls >= 3) controller.abort();
      return [5]; // still OPEN on-chain every poll, but must not respawn
    };

    await runSupervisor(base({ discover, project, signal: controller.signal }));

    expect(started).toEqual([5]);
  });

  it("survives a discovery error and keeps polling", async () => {
    const controller = new AbortController();
    const started: number[] = [];
    const project = async (fixtureId: number) => void started.push(fixtureId);
    let polls = 0;
    const discover = async () => {
      polls += 1;
      if (polls === 1) throw new Error("rpc down");
      if (polls >= 3) controller.abort();
      return [7];
    };

    await runSupervisor(base({ discover, project, signal: controller.signal }));

    expect(started).toEqual([7]);
  });

  it("aborts in-flight projectors on shutdown", async () => {
    const controller = new AbortController();
    let captured: AbortSignal | undefined;
    const project = (_fixtureId: number, sig: AbortSignal) => {
      captured = sig;
      return new Promise<void>(() => {}); // never resolves on its own
    };
    let polls = 0;
    const discover = async () => {
      polls += 1;
      if (polls >= 2) controller.abort();
      return [9];
    };

    await runSupervisor(base({ discover, project, signal: controller.signal }));

    expect(captured?.aborted).toBe(true);
  });
});
