import { Connection, PublicKey } from "@solana/web3.js";
import {
  MATCH_ACCOUNT_LEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  decodeMatch,
} from "@soccit/onchain/program";
import { config } from "../config.js";

let connection: Connection | undefined;

function getConnection(): Connection {
  if (!connection)
    connection = new Connection(config.solana.rpcUrl, "confirmed");
  return connection;
}

const TERMINAL_STATUSES = new Set<number>([STATUS_RESOLVED, STATUS_SETTLED]);

export async function fetchTerminalFixtureIds(): Promise<number[]> {
  const programId = new PublicKey(config.solana.programId);
  const accounts = await getConnection().getProgramAccounts(programId, {
    filters: [{ dataSize: MATCH_ACCOUNT_LEN }],
  });
  const ids: number[] = [];
  for (const { account } of accounts) {
    try {
      const m = decodeMatch(account.data);
      if (m.settled || TERMINAL_STATUSES.has(m.status)) {
        ids.push(Number(m.matchId));
      }
    } catch {
      // not a Match account (discriminator mismatch) — skip
    }
  }
  return ids;
}
