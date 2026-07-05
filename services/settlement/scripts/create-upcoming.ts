import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { buildCreateMatchInstruction, matchPda } from "@soccit/onchain/program";
import { config } from "../src/config.js";
import { loadKeypair } from "../src/keeper.js";
import { logger } from "../src/logger.js";
import { selectUpcoming, type ScheduleFixture } from "../src/match-creation.js";

async function fetchSchedule(baseUrl: string): Promise<ScheduleFixture[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/schedule`);
  if (!res.ok)
    throw new Error(`schedule fetch failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as ScheduleFixture[];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const baseUrl = config.matchCreation.scheduleApiUrl;
  if (!baseUrl)
    throw new Error(
      "SCHEDULE_API_URL is required for the match-creation keeper",
    );

  const admin = loadKeypair(config.solana.resolverKeypairPath);
  const resolver = admin.publicKey;
  const programId = new PublicKey(config.solana.programId);
  const usdcMint = new PublicKey(config.solana.usdcMint);
  const connection = new Connection(config.solana.rpcUrl, "confirmed");

  const fixtures = await fetchSchedule(baseUrl);
  const nowSecs = Math.floor(Date.now() / 1000);
  const upcoming = selectUpcoming(
    fixtures,
    nowSecs,
    config.matchCreation.lookaheadSecs,
  );
  logger.info(
    {
      total: fixtures.length,
      upcoming: upcoming.length,
      lookaheadSecs: config.matchCreation.lookaheadSecs,
    },
    "match-creation keeper: selected upcoming fixtures",
  );

  let created = 0;
  let skipped = 0;
  for (const m of upcoming) {
    const match = matchPda(programId, BigInt(m.fixtureId));
    const existing = await connection.getAccountInfo(match);
    if (existing) {
      skipped += 1;
      continue; // idempotent — room already exists
    }

    if (dryRun) {
      logger.info(
        {
          fixtureId: m.fixtureId,
          startTimeSecs: m.startTimeSecs,
          match: match.toBase58(),
        },
        "would create room",
      );
      created += 1;
      continue;
    }

    const ix = buildCreateMatchInstruction({
      programId,
      admin: admin.publicKey,
      usdcMint,
      matchId: BigInt(m.fixtureId),
      team1Id: m.team1Id,
      team2Id: m.team2Id,
      entryFee: config.entryFeeBaseUnits,
      resolver,
      startTime: BigInt(m.startTimeSecs),
    });
    try {
      const sig = await connection.sendTransaction(
        new Transaction().add(ix),
        [admin],
        {
          skipPreflight: false,
        },
      );
      await connection.confirmTransaction(sig, "confirmed");
      created += 1;
      logger.info(
        {
          fixtureId: m.fixtureId,
          startTimeSecs: m.startTimeSecs,
          match: match.toBase58(),
          sig,
        },
        "created room",
      );
    } catch (err) {
      logger.error(
        { fixtureId: m.fixtureId, err: String(err) },
        "create room failed",
      );
    }
  }

  logger.info({ created, skipped }, "match-creation keeper done");
}

main().catch((err) => {
  logger.error({ err: String(err) }, "create-upcoming failed");
  process.exit(1);
});
