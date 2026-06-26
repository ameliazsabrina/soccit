import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

export const TXLINE_PROGRAM_ID = new PublicKey(
  "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
);
export const TXL_MINT = new PublicKey(
  "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
);
export const TXL_TOKEN_PROGRAM = TOKEN_2022_PROGRAM_ID;

export const SUBSCRIBE_DISCRIMINATOR = Uint8Array.from([
  254, 28, 191, 138, 156, 179, 183, 53,
]);

export const SERVICE_LEVEL_WORLDCUP = 12;
export const MIN_WEEKS = 4;

export interface TxlinePdas {
  pricingMatrix: PublicKey;
  tokenTreasuryPda: PublicKey;
  tokenTreasuryVault: PublicKey;
}

export function deriveTxlinePdas(programId = TXLINE_PROGRAM_ID): TxlinePdas {
  const [pricingMatrix] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    programId,
  );
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    programId,
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    TXL_MINT,
    tokenTreasuryPda,
    true,
    TXL_TOKEN_PROGRAM,
  );
  return { pricingMatrix, tokenTreasuryPda, tokenTreasuryVault };
}

export function encodeSubscribeData(serviceLevelId: number, weeks: number): Buffer {
  const data = Buffer.alloc(8 + 2 + 1);
  Buffer.from(SUBSCRIBE_DISCRIMINATOR).copy(data, 0);
  data.writeUInt16LE(serviceLevelId, 8);
  data.writeUInt8(weeks, 10);
  return data;
}

export interface SubscribeParams {
  user: PublicKey;
  serviceLevelId?: number;
  weeks?: number;
  programId?: PublicKey;
}

export function buildSubscribeInstruction(params: SubscribeParams): TransactionInstruction {
  const {
    user,
    serviceLevelId = SERVICE_LEVEL_WORLDCUP,
    weeks = MIN_WEEKS,
    programId = TXLINE_PROGRAM_ID,
  } = params;

  const { pricingMatrix, tokenTreasuryPda, tokenTreasuryVault } = deriveTxlinePdas(programId);
  const userTokenAccount = getAssociatedTokenAddressSync(
    TXL_MINT,
    user,
    false,
    TXL_TOKEN_PROGRAM,
  );

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: pricingMatrix, isSigner: false, isWritable: false },
      { pubkey: TXL_MINT, isSigner: false, isWritable: false },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
      { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
      { pubkey: TXL_TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: encodeSubscribeData(serviceLevelId, weeks),
  });
}
