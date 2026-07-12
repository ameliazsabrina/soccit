import { Connection } from "@solana/web3.js";
import { Redis } from "ioredis";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { createPredictionSource } from "./onchain/predictions.js";
import { fetchActiveFixtureIds } from "./onchain/program.js";
import { runProjector } from "./projector.js";
import { runSupervisor } from "./supervisor.js";
import { LeaderboardStore } from "./store/leaderboard.js";

async function main(): Promise<void> {
  const controller = new AbortController();
  const shutdown = (sig: string) => {
    logger.info({ sig }, "shutting down");
    controller.abort();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const redis = new Redis(config.redis.url, { maxRetriesPerRequest: null });
  const store = new LeaderboardStore(redis);
  await store.init();
  const predictions = createPredictionSource();

  try {
    if (config.fixtureId != null) {
      // Explicit single-fixture override (tests / manual replay).
      logger.info(
        { fixtureId: config.fixtureId, source: config.predictions.source },
        "soccit scoring starting (single-fixture override)",
      );
      await runProjector({
        redis,
        store,
        predictions,
        fixtureId: config.fixtureId,
        signal: controller.signal,
      });
    } else {
      const conn = new Connection(config.solana.rpcUrl, "confirmed");
      logger.info(
        {
          source: config.predictions.source,
          programId: config.solana.programId,
          pollIntervalMs: config.pollIntervalMs,
        },
        "soccit scoring starting (multi-fixture supervisor)",
      );
      await runSupervisor({
        redis,
        store,
        predictions,
        discover: () => fetchActiveFixtureIds(conn, config.excludedMatchPdas),
        pollIntervalMs: config.pollIntervalMs,
        signal: controller.signal,
      });
    }
  } finally {
    await store.close();
    redis.disconnect();
    logger.info("scoring stopped");
  }
}

main().catch((err) => {
  logger.error({ err: String(err) }, "fatal");
  process.exit(1);
});
