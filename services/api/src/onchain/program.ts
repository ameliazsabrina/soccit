import { Connection, PublicKey } from "@solana/web3.js";
import { type DecodedMatch, decodeMatch, matchPda } from "@soccit/onchain/program";
import { config } from "../config.js";

// Re-export the shared on-chain bindings so existing API imports
// (`../../onchain/program.js`) keep resolving while the single source of
// truth lives in @soccit/onchain — used by both the API and settlement.
export {
  type DecodedMatch,
  MATCH_ACCOUNT_LEN,
  STATUS_OPEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  KIND_OUT,
  KIND_IN,
  KIND_COMBO,
  associatedTokenAddress,
  buildPlacePredictionInstruction,
  decodeMatch,
  entryPda,
  matchIdToLe,
  matchPda,
  predictionPda,
  vaultAuthorityPda,
} from "@soccit/onchain/program";

let connection: Connection | undefined;
let programId: PublicKey | undefined;

export function getConnection(): Connection {
  if (!connection) connection = new Connection(config.solana.rpcUrl, "confirmed");
  return connection;
}

export function getProgramId(): PublicKey {
  if (!programId) programId = new PublicKey(config.solana.programId);
  return programId;
}

export async function fetchMatch(fixtureId: number): Promise<DecodedMatch | null> {
  const pda = matchPda(getProgramId(), BigInt(fixtureId));
  const info = await getConnection().getAccountInfo(pda);
  if (!info) return null;
  return decodeMatch(info.data);
}
