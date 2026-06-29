import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { config } from "../src/config.js";
import { loadKeypair } from "../src/keeper.js";
import {
  buildPlacePredictionInstruction,
  decodeMatch,
  matchPda,
  predictionPda,
} from "@soccit/onchain/program";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const fixtureId = BigInt(arg("fixture") ?? (config.fixtureId ?? ""));
  if (!fixtureId) throw new Error("fixture id required (--fixture or SETTLEMENT_FIXTURE_ID)");
  const side = Number(arg("side") ?? 1);
  const kind = Number(arg("kind") ?? 2);
  const outId = Number(arg("out") ?? 0);
  const inId = Number(arg("in") ?? 0);
  const lockMinute = Number(arg("lock") ?? 0);
  const slotIndex = Number(arg("slot") ?? 0);

  const user = loadKeypair(arg("user") ?? config.solana.resolverKeypairPath);
  const programId = new PublicKey(config.solana.programId);
  const connection = new Connection(config.solana.rpcUrl, "confirmed");

  const matchAccount = matchPda(programId, fixtureId);
  const info = await connection.getAccountInfo(matchAccount);
  if (!info) throw new Error(`match ${fixtureId} not found on-chain`);
  const match = decodeMatch(info.data as Buffer);

  const userUsdcAta = getAssociatedTokenAddressSync(match.usdcMint, user.publicKey);
  const prediction = predictionPda(programId, matchAccount, user.publicKey, slotIndex);

  console.error(`> user:       ${user.publicKey.toBase58()}`);
  console.error(`> match:      ${matchAccount.toBase58()}`);
  console.error(`> mint:       ${match.usdcMint.toBase58()}`);
  console.error(`> user ATA:   ${userUsdcAta.toBase58()}`);
  console.error(`> prediction: ${prediction.toBase58()}`);
  console.error(`> side=${side} kind=${kind} out=${outId} in=${inId} lock=${lockMinute} slot=${slotIndex}`);

  const ix = buildPlacePredictionInstruction({
    programId,
    user: user.publicKey,
    matchAccount,
    userUsdcAta,
    vault: match.vault,
    side,
    kind,
    outId,
    inId,
    lockMinute,
    slotIndex,
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [user], { skipPreflight: false });
  await connection.confirmTransaction(sig, "confirmed");
  console.error(`> placed prediction, sig: ${sig}`);
  console.log(JSON.stringify({ prediction: prediction.toBase58(), owner: user.publicKey.toBase58(), sig }));
}

main().catch((err) => {
  console.error("place-prediction failed:", String(err));
  process.exit(1);
});
