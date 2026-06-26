import { readFileSync } from "node:fs";
import {
  Connection,
  Keypair,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { config } from "../src/config.js";
import {
  MIN_WEEKS,
  SERVICE_LEVEL_WORLDCUP,
  TXL_MINT,
  TXL_TOKEN_PROGRAM,
  buildSubscribeInstruction,
} from "../src/txline/program.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

function loadKeypair(path: string): Keypair {
  const bytes = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

async function main(): Promise<void> {
  const rpc = arg("rpc") ?? config.solana.rpcUrl;
  const weeks = Number(arg("weeks") ?? MIN_WEEKS);
  const serviceLevel = Number(arg("service-level") ?? SERVICE_LEVEL_WORLDCUP);
  const simulate = hasFlag("simulate");
  const isLocal = /127\.0\.0\.1|localhost/.test(rpc);

  const payer = loadKeypair(config.solana.keypairPath);
  const connection = new Connection(rpc, "confirmed");

  console.error(`> rpc:           ${rpc}`);
  console.error(`> wallet:        ${payer.publicKey.toBase58()}`);
  console.error(`> service level: ${serviceLevel} (weeks=${weeks})`);

  if (isLocal) {
    try {
      const sig = await connection.requestAirdrop(payer.publicKey, 2_000_000_000);
      await connection.confirmTransaction(sig, "confirmed");
      console.error("> airdropped 2 SOL on local fork");
    } catch (e) {
      console.error("> airdrop skipped:", String(e));
    }
  }

  const userTxlAta = getAssociatedTokenAddressSync(
    TXL_MINT,
    payer.publicKey,
    false,
    TXL_TOKEN_PROGRAM,
  );
  const tx = new Transaction()
    .add(
      createAssociatedTokenAccountIdempotentInstruction(
        payer.publicKey,
        userTxlAta,
        payer.publicKey,
        TXL_MINT,
        TXL_TOKEN_PROGRAM,
      ),
    )
    .add(buildSubscribeInstruction({ user: payer.publicKey, serviceLevelId: serviceLevel, weeks }));

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);

  if (simulate) {
    const sim = await connection.simulateTransaction(tx);
    console.error("\n--- simulation ---");
    console.error("err:", JSON.stringify(sim.value.err));
    for (const log of sim.value.logs ?? []) console.error(log);
    if (sim.value.err) process.exit(1);
    console.error("\nsimulation OK (no signature produced in --simulate mode)");
    return;
  }

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, "confirmed");

  console.error("\nsubscribed. TXLINE_TX_SIG:\n");
  console.log(sig);
  console.error(`\nNext: pnpm subscribe ${sig}`);
}

main().catch((err) => {
  console.error("subscribe failed:", err);
  process.exit(1);
});
