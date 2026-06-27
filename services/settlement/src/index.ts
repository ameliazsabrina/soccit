import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { loadKeypair, type KeeperDeps } from "./keeper.js";
import { watchFixture } from "./watch.js";

async function main(): Promise<void> {
  if (config.fixtureId == null) throw new Error("SETTLEMENT_FIXTURE_ID is required");
  const fixtureId = config.fixtureId;

  const programId = new PublicKey(config.solana.programId);
  const platformWallet = new PublicKey(config.solana.platformWallet);
  const resolver = loadKeypair(config.solana.resolverKeypairPath);
  const connection = new Connection(config.solana.rpcUrl, "confirmed");

  logger.info(
    {
      fixtureId,
      programId: programId.toBase58(),
      resolver: resolver.publicKey.toBase58(),
      platformWallet: platformWallet.toBase58(),
    },
    "soccit settlement keeper starting",
  );

  const controller = new AbortController();
  const shutdown = (sig: string) => {
    logger.info({ sig }, "shutting down");
    controller.abort();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const deps: KeeperDeps = { connection, programId, resolver, platformWallet };

  await watchFixture({
    deps,
    redisUrl: config.redis.url,
    fixtureId,
    pollIntervalMs: config.pollIntervalMs,
    signal: controller.signal,
  });
  logger.info({ fixtureId }, "settlement keeper stopped");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "fatal");
  process.exit(1);
});
