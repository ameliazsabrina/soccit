import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve as pathResolve } from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  buildCreateMatchInstruction,
  buildEnterMatchInstruction,
  buildPlacePredictionInstruction,
  buildResolveInstruction,
  buildSettleInstruction,
  decodeMatch,
  matchPda,
  vaultAuthorityPda,
  KIND_OUT,
} from "@soccit/onchain/program";

const RPC = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v");
const ENTRY_FEE = 5_000_000n; // 5 USDC (6 decimals)
const DECIMALS = 6;

function loadKeypair(p: string): Keypair {
  const path = p.startsWith("~/") ? pathResolve(homedir(), p.slice(2)) : p;
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))),
  );
}

async function send(
  conn: Connection,
  ixs: any[],
  signers: Keypair[],
): Promise<string> {
  const tx = new Transaction().add(...ixs);
  const sig = await conn.sendTransaction(tx, signers, { skipPreflight: false });
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}

async function bal(conn: Connection, ata: PublicKey): Promise<bigint> {
  return (await getAccount(conn, ata)).amount;
}

async function main(): Promise<void> {
  const conn = new Connection(RPC, "confirmed");
  const funder = loadKeypair("~/.config/solana/id.json");
  console.log(`funder/admin/resolver/platform: ${funder.publicKey.toBase58()}`);
  console.log(
    `funder SOL: ${(await conn.getBalance(funder.publicKey)) / LAMPORTS_PER_SOL}`,
  );

  const mint = await createMint(conn, funder, funder.publicKey, null, DECIMALS);
  console.log(`test mint: ${mint.toBase58()}`);

  const users = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
  const fundIxs = users.map((u) =>
    SystemProgram.transfer({
      fromPubkey: funder.publicKey,
      toPubkey: u.publicKey,
      lamports: 0.05 * LAMPORTS_PER_SOL,
    }),
  );
  await send(conn, fundIxs, [funder]);
  console.log(`funded ${users.length} users with 0.05 SOL each`);

  const userAtas: PublicKey[] = [];
  for (const u of users) {
    const acc = await getOrCreateAssociatedTokenAccount(
      conn,
      funder,
      mint,
      u.publicKey,
    );
    await mintTo(conn, funder, mint, acc.address, funder, 10_000_000n); // 10 USDC
    userAtas.push(acc.address);
  }
  const platformAta = (
    await getOrCreateAssociatedTokenAccount(
      conn,
      funder,
      mint,
      funder.publicKey,
    )
  ).address;
  console.log(`platform ATA: ${platformAta.toBase58()}`);

  const matchId =
    BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
  const match = matchPda(PROGRAM_ID, matchId);
  const vaultAuthority = vaultAuthorityPda(PROGRAM_ID, match);
  const vault = getAssociatedTokenAddressSync(mint, vaultAuthority, true);
  await send(
    conn,
    [
      buildCreateMatchInstruction({
        programId: PROGRAM_ID,
        admin: funder.publicKey,
        usdcMint: mint,
        matchId,
        team1Id: 1,
        team2Id: 2,
        entryFee: ENTRY_FEE,
        resolver: funder.publicKey,
        startTime: 0n,
      }),
    ],
    [funder],
  );
  console.log(`created match ${matchId} -> ${match.toBase58()}`);

  // --- Enter-once: each user pays ENTRY_FEE once, then places a free pick ---
  for (let i = 0; i < users.length; i++) {
    const user = users[i]!;
    const userAta = userAtas[i]!;
    await send(
      conn,
      [
        buildEnterMatchInstruction({
          programId: PROGRAM_ID,
          user: user.publicKey,
          matchAccount: match,
          userUsdcAta: userAta,
          vault,
        }),
      ],
      [user],
    );
    console.log(`user ${i} entered (paid ENTRY_FEE)`);

    await send(
      conn,
      [
        buildPlacePredictionInstruction({
          programId: PROGRAM_ID,
          user: user.publicKey,
          matchAccount: match,
          side: 1,
          kind: KIND_OUT,
          outId: 10 + i, // distinct player ids
          inId: 0,
          lockMinute: 20,
          slotIndex: 0,
        }),
      ],
      [user],
    );
    console.log(`user ${i} placed prediction (free)`);
  }

  const m1 = decodeMatch(Buffer.from((await conn.getAccountInfo(match))!.data));
  const pool = m1.poolTotal;
  console.log(
    `participant_count=${m1.participantCount} pool_total=${pool} (vault=${await bal(conn, vault)})`,
  );

  await send(
    conn,
    [
      buildResolveInstruction({
        programId: PROGRAM_ID,
        resolver: funder.publicKey,
        matchAccount: match,
        terminalPhase: 1,
        winner1: users[0]!.publicKey,
        winner2: users[1]!.publicKey,
        winner3: users[2]!.publicKey,
      }),
    ],
    [funder],
  );
  console.log(
    `resolved (status=${decodeMatch(Buffer.from((await conn.getAccountInfo(match))!.data)).status})`,
  );

  const before = {
    w0: await bal(conn, userAtas[0]!),
    w1: await bal(conn, userAtas[1]!),
    w2: await bal(conn, userAtas[2]!),
    plat: await bal(conn, platformAta),
  };
  await send(
    conn,
    [
      buildSettleInstruction({
        programId: PROGRAM_ID,
        resolver: funder.publicKey,
        matchAccount: match,
        vaultAuthority,
        vault,
        winner1Ata: userAtas[0]!,
        winner2Ata: userAtas[1]!,
        winner3Ata: userAtas[2]!,
        platformAta,
      }),
    ],
    [funder],
  );
  const after = {
    w0: await bal(conn, userAtas[0]!),
    w1: await bal(conn, userAtas[1]!),
    w2: await bal(conn, userAtas[2]!),
    plat: await bal(conn, platformAta),
    vault: await bal(conn, vault),
  };

  const got = {
    w0: after.w0 - before.w0,
    w1: after.w1 - before.w1,
    w2: after.w2 - before.w2,
    plat: after.plat - before.plat,
  };
  const exp = {
    w0: (pool * 40n) / 100n,
    w1: (pool * 24n) / 100n,
    w2: (pool * 16n) / 100n,
    plat:
      pool - (pool * 40n) / 100n - (pool * 24n) / 100n - (pool * 16n) / 100n,
  };

  console.log("\n=== payout deltas (base units, 6 decimals) ===");
  const rows = [
    ["winner1 (40%)", got.w0, exp.w0],
    ["winner2 (24%)", got.w1, exp.w1],
    ["winner3 (16%)", got.w2, exp.w2],
    ["platform (20%)", got.plat, exp.plat],
  ] as const;
  let ok = true;
  for (const [label, g, e] of rows) {
    const pass = g === e;
    ok = ok && pass;
    console.log(
      `  ${label}: got ${g} expected ${e}  ${pass ? "OK" : "MISMATCH"}`,
    );
  }
  console.log(
    `  vault drained to: ${after.vault} ${after.vault === 0n ? "OK" : "NOT EMPTY"}`,
  );
  ok = ok && after.vault === 0n;

  console.log(
    `\n${ok ? "PASS" : "FAIL"}: on-chain settle pays 40/24/16 + 20% platform`,
  );
  console.log(
    `match: https://explorer.solana.com/address/${match.toBase58()}?cluster=devnet`,
  );
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error("e2e-devnet failed:", err);
  process.exit(1);
});
