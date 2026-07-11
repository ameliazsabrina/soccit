import { homedir } from "node:os";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const USDC_MINT_DEFAULT = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
} as const;

const HELIUS_SUBDOMAIN = {
  devnet: "devnet",
  "mainnet-beta": "mainnet",
} as const;

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return resolve(homedir(), p.slice(2));
  return p;
}

const Schema = z.object({
  SOLANA_CLUSTER: z.enum(["devnet", "mainnet-beta"]).default("devnet"),
  SOLANA_RPC_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ),
  HELIUS_API_KEY: z.string().optional(),
  PROGRAM_ID: z.string().default("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v"),
  RESOLVER_KEYPAIR_PATH: z
    .string()
    .default("~/.config/solana/soccit-resolver.json"),
  PLATFORM_WALLET: z.string(),
  USDC_MINT: z.string().optional(),
  ENTRY_FEE_BASE_UNITS: z.coerce.bigint().positive().default(5_000_000n),
  SETTLEMENT_FIXTURE_ID: z.string().optional(),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.string().default("info"),
  SCHEDULE_API_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ),
  MATCH_CREATE_LOOKAHEAD_SECS: z.coerce
    .number()
    .int()
    .positive()
    .default(21_600),
  MATCH_CREATE_POLL_MS: z.coerce.number().int().positive().default(60_000),
});

const env = Schema.parse(process.env);

function resolveRpcUrl(): string {
  if (env.SOLANA_RPC_URL) return env.SOLANA_RPC_URL;
  const key =
    env.HELIUS_API_KEY ??
    (process.env.NODE_ENV === "test" ? "test" : undefined);
  if (!key) throw new Error("Set SOLANA_RPC_URL or HELIUS_API_KEY");
  if (key === "test" && process.env.NODE_ENV !== "test") {
    throw new Error(
      'HELIUS_API_KEY is the placeholder "test"; set a real key or SOLANA_RPC_URL',
    );
  }
  return `https://${HELIUS_SUBDOMAIN[env.SOLANA_CLUSTER]}.helius-rpc.com/?api-key=${encodeURIComponent(key)}`;
}

export const config = {
  solana: {
    cluster: env.SOLANA_CLUSTER,
    rpcUrl: resolveRpcUrl(),
    programId: env.PROGRAM_ID,
    resolverKeypairPath: expandHome(env.RESOLVER_KEYPAIR_PATH),
    platformWallet: env.PLATFORM_WALLET,
    usdcMint: env.USDC_MINT || USDC_MINT_DEFAULT[env.SOLANA_CLUSTER],
  },
  entryFeeBaseUnits: env.ENTRY_FEE_BASE_UNITS,
  fixtureId: env.SETTLEMENT_FIXTURE_ID
    ? Number(env.SETTLEMENT_FIXTURE_ID)
    : undefined,
  pollIntervalMs: env.POLL_INTERVAL_MS,
  redis: { url: env.REDIS_URL },
  logLevel: env.LOG_LEVEL,
  matchCreation: {
    scheduleApiUrl: env.SCHEDULE_API_URL,
    lookaheadSecs: env.MATCH_CREATE_LOOKAHEAD_SECS,
    pollMs: env.MATCH_CREATE_POLL_MS,
  },
} as const;

export type Config = typeof config;
