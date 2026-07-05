import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { config } from "../src/config.js";
import { loadKeypair } from "../src/keeper.js";
import {
  buildCreateMatchInstruction,
  matchPda,
  vaultAuthorityPda,
} from "@soccit/onchain/program";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const fixtureId = BigInt(arg("fixture") ?? (config.fixtureId ?? ""));
  const team1Id = Number(arg("team1") ?? 0);
  const team2Id = Number(arg("team2") ?? 0);
  const entryFee = BigInt(arg("fee") ?? config.entryFeeBaseUnits);
  const mintStr = arg("mint") ?? config.solana.usdcMint;
  if (!mintStr) throw new Error("USDC mint required (--mint or USDC_MINT)");
  if (!fixtureId) throw new Error("fixture id required (--fixture or SETTLEMENT_FIXTURE_ID)");

  // Kickoff time (unix seconds); entries open ENTRY_LEAD_SECS before it on-chain.
  // --start-epoch-ms takes a feed StartTime (ms) and converts; --start-time is
  // raw unix seconds. Default 0 = entry gate disabled (always open, for tests).
  const startEpochMs = arg("start-epoch-ms");
  const startTime =
    startEpochMs != null
      ? BigInt(Math.floor(Number(startEpochMs) / 1000))
      : BigInt(arg("start-time") ?? 0);

  const adminPath = arg("admin") ?? config.solana.resolverKeypairPath;
  const admin = loadKeypair(adminPath);
  const resolver = arg("resolver")
    ? new PublicKey(arg("resolver")!)
    : loadKeypair(config.solana.resolverKeypairPath).publicKey;

  const programId = new PublicKey(config.solana.programId);
  const usdcMint = new PublicKey(mintStr);
  const connection = new Connection(config.solana.rpcUrl, "confirmed");

  const match = matchPda(programId, fixtureId);
  const vaultAuthority = vaultAuthorityPda(programId, match);
  const vault = getAssociatedTokenAddressSync(usdcMint, vaultAuthority, true);

  console.error(`> rpc:        ${config.solana.rpcUrl}`);
  console.error(`> admin:      ${admin.publicKey.toBase58()}`);
  console.error(`> resolver:   ${resolver.toBase58()}`);
  console.error(`> fixture:    ${fixtureId}`);
  console.error(`> start_time: ${startTime}${startTime === 0n ? " (gate disabled)" : ""}`);
  console.error(`> mint:       ${usdcMint.toBase58()}`);
  console.error(`> match PDA:  ${match.toBase58()}`);
  console.error(`> vault auth: ${vaultAuthority.toBase58()}`);
  console.error(`> vault ATA:  ${vault.toBase58()}`);

  const ix = buildCreateMatchInstruction({
    programId,
    admin: admin.publicKey,
    usdcMint,
    matchId: fixtureId,
    team1Id,
    team2Id,
    entryFee,
    resolver,
    startTime,
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [admin], { skipPreflight: false });
  await connection.confirmTransaction(sig, "confirmed");
  console.error(`> created match, sig: ${sig}`);
  console.log(JSON.stringify({ fixtureId: fixtureId.toString(), match: match.toBase58(), vault: vault.toBase58(), sig }));
}

main().catch((err) => {
  console.error("create-match failed:", String(err));
  process.exit(1);
});
