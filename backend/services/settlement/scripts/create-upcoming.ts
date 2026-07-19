import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../src/config.js";
import { loadKeypair } from "../src/keeper.js";
import { logger } from "../src/logger.js";
import { runMatchCreation } from "../src/match-creation.js";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const baseUrl = config.matchCreation.scheduleApiUrl;
  if (!baseUrl)
    throw new Error(
      "SCHEDULE_API_URL is required for the match-creation keeper",
    );

  const resolver = loadKeypair(config.solana.resolverKeypairPath);
  const { created, skipped } = await runMatchCreation({
    connection: new Connection(config.solana.rpcUrl, "confirmed"),
    programId: new PublicKey(config.solana.programId),
    resolver,
    usdcMint: new PublicKey(config.solana.usdcMint),
    cluster: config.solana.cluster,
    entryFee: config.entryFeeBaseUnits,
    scheduleApiUrl: baseUrl,
    lookaheadSecs: config.matchCreation.lookaheadSecs,
    dryRun,
  });
  logger.info({ created, skipped, dryRun }, "match-creation keeper done");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "create-upcoming failed");
  process.exit(1);
});
