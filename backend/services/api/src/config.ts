import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { CANONICAL_USDC_MINT } from "@soccit/onchain/program";

loadDotenv();

const HELIUS_SUBDOMAIN = {
  devnet: "devnet",
  "mainnet-beta": "mainnet",
} as const;

const Schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  MONGO_URL: z.string().optional(),
  MONGO_DB: z.string().default("soccit"),
  SESSION_JWT_SECRET: z.string().optional(),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  SOLANA_CLUSTER: z.enum(["devnet", "mainnet-beta"]).default("devnet"),
  SOLANA_RPC_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ),
  HELIUS_API_KEY: z.string().optional(),
  PROGRAM_ID: z.string().default("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v"),
  USDC_MINT: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  SSE_KEEPALIVE_MS: z.coerce.number().int().positive().default(15000),
  STREAM_BLOCK_MS: z.coerce.number().int().positive().default(5000),
  TXLINE_BASE_URL: z.string().url().default("https://txline.txodds.com"),
  TXLINE_API_TOKEN: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
  EXCLUDED_MATCH_PDAS: z.string().default(""),
});

const env = Schema.parse(process.env);

const canonicalUsdcMint = CANONICAL_USDC_MINT[env.SOLANA_CLUSTER];
if (env.USDC_MINT && env.USDC_MINT !== canonicalUsdcMint) {
  throw new Error(
    `USDC_MINT=${env.USDC_MINT} is not the canonical ${env.SOLANA_CLUSTER} USDC mint ` +
      `${canonicalUsdcMint}. Unset USDC_MINT or correct it.`,
  );
}

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
  port: env.PORT,
  host: env.HOST,
  redis: { url: env.REDIS_URL },
  mongo: { url: env.MONGO_URL || undefined, db: env.MONGO_DB },
  session: {
    secret: env.SESSION_JWT_SECRET || undefined,
    ttlSeconds: env.SESSION_TTL_SECONDS,
  },
  solana: {
    cluster: env.SOLANA_CLUSTER,
    rpcUrl: resolveRpcUrl(),
    programId: env.PROGRAM_ID,
    usdcMint: canonicalUsdcMint,
  },
  sseKeepaliveMs: env.SSE_KEEPALIVE_MS,
  streamBlockMs: env.STREAM_BLOCK_MS,
  txline: {
    baseUrl: env.TXLINE_BASE_URL.replace(/\/$/, ""),
    apiToken: env.TXLINE_API_TOKEN || undefined,
  },
  logLevel: env.LOG_LEVEL,
  excludedMatchPdas: new Set(
    env.EXCLUDED_MATCH_PDAS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
} as const;

export type Config = typeof config;
