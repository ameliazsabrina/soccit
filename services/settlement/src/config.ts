import { homedir } from "node:os";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

function heliusDevnetRpcUrl(apiKey: string): string {
  return `https://devnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
}

const heliusApiKey = process.env.NODE_ENV === "test"
  ? z.string().default("test")
  : z.string().min(1, "HELIUS_API_KEY is required");

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return resolve(homedir(), p.slice(2));
  return p;
}

const Schema = z.object({
  HELIUS_API_KEY: heliusApiKey,
  PROGRAM_ID: z.string().default("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v"),
  RESOLVER_KEYPAIR_PATH: z.string().default("~/.config/solana/soccit-resolver.json"),
  PLATFORM_WALLET: z.string(),
  USDC_MINT: z.string().optional(),
  ENTRY_FEE_BASE_UNITS: z.coerce.bigint().positive().default(1_000_000n),
  SETTLEMENT_FIXTURE_ID: z.string().optional(),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.string().default("info"),
});

const env = Schema.parse(process.env);

export const config = {
  solana: {
    rpcUrl: heliusDevnetRpcUrl(env.HELIUS_API_KEY),
    programId: env.PROGRAM_ID,
    resolverKeypairPath: expandHome(env.RESOLVER_KEYPAIR_PATH),
    platformWallet: env.PLATFORM_WALLET,
    usdcMint: env.USDC_MINT || DEVNET_USDC_MINT,
  },
  entryFeeBaseUnits: env.ENTRY_FEE_BASE_UNITS,
  fixtureId: env.SETTLEMENT_FIXTURE_ID ? Number(env.SETTLEMENT_FIXTURE_ID) : undefined,
  pollIntervalMs: env.POLL_INTERVAL_MS,
  redis: { url: env.REDIS_URL },
  logLevel: env.LOG_LEVEL,
} as const;

export type Config = typeof config;
