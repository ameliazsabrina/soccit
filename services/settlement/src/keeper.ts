import { readFileSync } from "node:fs";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { logger } from "./logger.js";
import {
  STATUS_OPEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  buildResolveInstruction,
  buildSettleInstruction,
  decodeMatch,
  matchPda,
  vaultAuthorityPda,
  type DecodedMatch,
} from "./onchain/program.js";
import type { LeaderboardPayload } from "./leaderboard.js";

export const DEFAULT_TERMINAL_PHASE = 1;

export function loadKeypair(path: string): Keypair {
  const bytes = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

export interface KeeperDeps {
  connection: Connection;
  programId: PublicKey;
  resolver: Keypair;
  platformWallet: PublicKey;
  terminalPhase?: number;
}

function parseWinner(s: string | null): PublicKey | null {
  return s ? new PublicKey(s) : null;
}

async function fetchMatch(deps: KeeperDeps, fixtureId: number): Promise<{ pda: PublicKey; match: DecodedMatch } | null> {
  const pda = matchPda(deps.programId, BigInt(fixtureId));
  const info = await deps.connection.getAccountInfo(pda);
  if (!info) return null;
  return { pda, match: decodeMatch(info.data as Buffer) };
}

export async function settleFixture(
  deps: KeeperDeps,
  payload: LeaderboardPayload,
): Promise<string | null> {
  const fixtureId = payload.fixtureId;
  const found = await fetchMatch(deps, fixtureId);
  if (!found) {
    logger.warn({ fixtureId }, "no Match account on-chain — skipping");
    return null;
  }
  const { pda: matchAccount, match } = found;

  if (match.status === STATUS_SETTLED || match.settled) {
    logger.info({ fixtureId }, "match already settled — nothing to do");
    return null;
  }

  const mint = match.usdtMint;
  const vaultAuthority = vaultAuthorityPda(deps.programId, matchAccount);

  const winners =
    match.status === STATUS_OPEN
      ? (payload.winners.map(parseWinner) as [PublicKey | null, PublicKey | null, PublicKey | null])
      : ([match.winner1, match.winner2, match.winner3].map((w) =>
          w.equals(PublicKey.default) ? null : w,
        ) as [PublicKey | null, PublicKey | null, PublicKey | null]);

  const winnerAtas = winners.map((w) => (w ? getAssociatedTokenAddressSync(mint, w) : null)) as [
    PublicKey | null,
    PublicKey | null,
    PublicKey | null,
  ];
  const platformAta = getAssociatedTokenAddressSync(mint, deps.platformWallet);

  const ixs: TransactionInstruction[] = [];

  for (const [i, w] of winners.entries()) {
    if (w && winnerAtas[i]) {
      ixs.push(
        createAssociatedTokenAccountIdempotentInstruction(deps.resolver.publicKey, winnerAtas[i]!, w, mint),
      );
    }
  }
  ixs.push(
    createAssociatedTokenAccountIdempotentInstruction(
      deps.resolver.publicKey,
      platformAta,
      deps.platformWallet,
      mint,
    ),
  );

  if (match.status === STATUS_OPEN) {
    ixs.push(
      buildResolveInstruction({
        programId: deps.programId,
        resolver: deps.resolver.publicKey,
        matchAccount,
        terminalPhase: deps.terminalPhase ?? DEFAULT_TERMINAL_PHASE,
        winner1: winners[0] ?? PublicKey.default,
        winner2: winners[1] ?? PublicKey.default,
        winner3: winners[2] ?? PublicKey.default,
      }),
    );
  } else if (match.status !== STATUS_RESOLVED) {
    logger.warn({ fixtureId, status: match.status }, "unexpected match status — skipping");
    return null;
  }

  ixs.push(
    buildSettleInstruction({
      programId: deps.programId,
      resolver: deps.resolver.publicKey,
      matchAccount,
      vaultAuthority,
      vault: match.vault,
      winner1Ata: winnerAtas[0],
      winner2Ata: winnerAtas[1],
      winner3Ata: winnerAtas[2],
      platformAta,
    }),
  );

  const tx = new Transaction().add(...ixs);
  const sig = await deps.connection.sendTransaction(tx, [deps.resolver], {
    skipPreflight: false,
  });
  await deps.connection.confirmTransaction(sig, "confirmed");
  logger.info(
    { fixtureId, sig, winners: winners.map((w) => w?.toBase58() ?? null) },
    "settled match on-chain",
  );
  return sig;
}
