import { Redis } from "ioredis";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { createPredictionSource } from "./onchain/predictions.js";
import { runProjector } from "./projector.js";
import { LeaderboardStore } from "./store/leaderboard.js";

async function main(): Promise<void> {
  if (config.fixtureId == null) throw new Error("SCORING_FIXTURE_ID is required");
  const fixtureId = config.fixtureId;

  logger.info(
    { fixtureId, source: config.predictions.source, programId: config.solana.programId },
    "soccit scoring starting (leaderboard projector)",
  );

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
    await runProjector({ redis, store, predictions, fixtureId, signal: controller.signal });
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
