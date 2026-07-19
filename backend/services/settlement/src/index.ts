import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { loadKeypair, type KeeperDeps } from "./keeper.js";
import { watchLeaderboards } from "./watch.js";
import { runMatchCreation } from "./match-creation.js";

function startMatchCreationLoop(
  connection: Connection,
  programId: PublicKey,
  resolver: ReturnType<typeof loadKeypair>,
  signal: AbortSignal,
): void {
  const { scheduleApiUrl, lookaheadSecs, pollMs } = config.matchCreation;
  if (!scheduleApiUrl) {
    logger.warn("SCHEDULE_API_URL unset — auto match-creation disabled");
    return;
  }
  const usdcMint = new PublicKey(config.solana.usdcMint);
  const tick = async () => {
    if (signal.aborted) return;
    try {
      const { created, skipped } = await runMatchCreation({
        connection,
        programId,
        resolver,
        usdcMint,
        cluster: config.solana.cluster,
        entryFee: config.entryFeeBaseUnits,
        scheduleApiUrl,
        lookaheadSecs,
      });
      if (created > 0)
        logger.info({ created, skipped }, "match-creation keeper pass");
    } catch (err) {
      logger.error({ err: String(err) }, "match-creation pass failed");
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), pollMs);
  signal.addEventListener("abort", () => clearInterval(timer), { once: true });
}

async function main(): Promise<void> {
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

  startMatchCreationLoop(connection, programId, resolver, controller.signal);

  await watchLeaderboards({
    deps,
    redisUrl: config.redis.url,
    pollIntervalMs: config.pollIntervalMs,
    signal: controller.signal,
  });
  logger.info({ fixtureId }, "settlement keeper stopped");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "fatal");
  process.exit(1);
});
