import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { buildCreateMatchInstruction, matchPda } from "@soccit/onchain/program";
import { logger } from "./logger.js";
export interface ScheduleFixture {
  fixtureId: number;
  startTime: number | null;
  team1: { id: number | null; name: string | null };
  team2: { id: number | null; name: string | null };
}

export interface UpcomingMatch {
  fixtureId: number;
  team1Id: number;
  team2Id: number;
  /** Kickoff time in unix SECONDS (converted from the feed's ms). */
  startTimeSecs: number;
}

export function selectUpcoming(
  fixtures: ScheduleFixture[],
  nowSecs: number,
  lookaheadSecs: number,
  graceSecs = 600,
): UpcomingMatch[] {
  const out: UpcomingMatch[] = [];
  for (const f of fixtures) {
    if (f.startTime == null || f.team1.id == null || f.team2.id == null)
      continue;
    const startTimeSecs = Math.floor(f.startTime / 1000);
    if (startTimeSecs < nowSecs - graceSecs) continue; // kicked off too long ago
    if (startTimeSecs > nowSecs + lookaheadSecs) continue; // too far out
    out.push({
      fixtureId: f.fixtureId,
      team1Id: f.team1.id,
      team2Id: f.team2.id,
      startTimeSecs,
    });
  }
  return out;
}

export async function fetchSchedule(
  baseUrl: string,
): Promise<ScheduleFixture[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/schedule`);
  if (!res.ok)
    throw new Error(`schedule fetch failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as ScheduleFixture[];
}

export interface MatchCreationDeps {
  connection: Connection;
  programId: PublicKey;
  resolver: Keypair;
  usdcMint: PublicKey;
  entryFee: bigint;
  scheduleApiUrl: string;
  lookaheadSecs: number;
  dryRun?: boolean;
}

export async function runMatchCreation(
  deps: MatchCreationDeps,
): Promise<{ created: number; skipped: number }> {
  const fixtures = await fetchSchedule(deps.scheduleApiUrl);
  const nowSecs = Math.floor(Date.now() / 1000);
  const upcoming = selectUpcoming(fixtures, nowSecs, deps.lookaheadSecs);

  let created = 0;
  let skipped = 0;
  for (const m of upcoming) {
    const match = matchPda(deps.programId, BigInt(m.fixtureId));
    const existing = await deps.connection.getAccountInfo(match);
    if (existing) {
      skipped += 1;
      continue; // idempotent — room already exists
    }
    if (deps.dryRun) {
      logger.info(
        { fixtureId: m.fixtureId, match: match.toBase58() },
        "would create room",
      );
      created += 1;
      continue;
    }

    const ix = buildCreateMatchInstruction({
      programId: deps.programId,
      admin: deps.resolver.publicKey,
      usdcMint: deps.usdcMint,
      matchId: BigInt(m.fixtureId),
      team1Id: m.team1Id,
      team2Id: m.team2Id,
      entryFee: deps.entryFee,
      resolver: deps.resolver.publicKey,
      startTime: BigInt(m.startTimeSecs),
    });
    try {
      const sig = await deps.connection.sendTransaction(
        new Transaction().add(ix),
        [deps.resolver],
        { skipPreflight: false },
      );
      await deps.connection.confirmTransaction(sig, "confirmed");
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
  return { created, skipped };
}
