import { config } from "./config.js";
import { logger } from "./logger.js";
import { Store } from "./store/index.js";
import { TokenManager } from "./txline/auth.js";
import { runIngest } from "./ingest.js";

async function main(): Promise<void> {
  logger.info(
    { baseUrl: config.txline.baseUrl, fixtureId: config.txline.fixtureId, leagues: config.txline.leagues },
    "soccit worker starting (TxLINE ingestor)",
  );

  const controller = new AbortController();
  const shutdown = (sig: string) => {
    logger.info({ sig }, "shutting down");
    controller.abort();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const store = new Store();
  await store.init();

  const tokens = new TokenManager();
  await tokens.get();
  logger.info("TxLINE credentials acquired");

  try {
    await runIngest({ tokens, store, signal: controller.signal });
  } finally {
    await store.close();
    logger.info("worker stopped");
  }
}

main().catch((err) => {
  logger.error({ err: String(err) }, "fatal");
  process.exit(1);
});
