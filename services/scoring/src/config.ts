import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const HELIUS_SUBDOMAIN = { devnet: "devnet", "mainnet-beta": "mainnet" } as const;

const Schema = z.object({
  SOLANA_CLUSTER: z.enum(["devnet", "mainnet-beta"]).default("devnet"),
  SOLANA_RPC_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  HELIUS_API_KEY: z.string().optional(),
  PROGRAM_ID: z.string().default("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v"),
  SCORING_FIXTURE_ID: z.string().optional(),
  PREDICTIONS_SOURCE: z.enum(["onchain", "file"]).default("onchain"),
  PREDICTIONS_FILE: z.string().optional(),
  REFRESH_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  MONGO_URL: z.string().optional(),
  MONGO_DB: z.string().default("soccit"),
  LOG_LEVEL: z.string().default("info"),
});

const env = Schema.parse(process.env);

if (env.PREDICTIONS_SOURCE === "file" && !env.PREDICTIONS_FILE) {
  throw new Error("PREDICTIONS_SOURCE=file requires PREDICTIONS_FILE");
}

function resolveRpcUrl(): string {
  if (env.SOLANA_RPC_URL) return env.SOLANA_RPC_URL;
  const key = env.HELIUS_API_KEY ?? (process.env.NODE_ENV === "test" ? "test" : undefined);
  if (!key) throw new Error("Set SOLANA_RPC_URL or HELIUS_API_KEY");
  if (key === "test" && process.env.NODE_ENV !== "test") {
    throw new Error('HELIUS_API_KEY is the placeholder "test"; set a real key or SOLANA_RPC_URL');
  }
  return `https://${HELIUS_SUBDOMAIN[env.SOLANA_CLUSTER]}.helius-rpc.com/?api-key=${encodeURIComponent(key)}`;
}

export const config = {
  solana: {
    cluster: env.SOLANA_CLUSTER,
    rpcUrl: resolveRpcUrl(),
    programId: env.PROGRAM_ID,
  },
  fixtureId: env.SCORING_FIXTURE_ID ? Number(env.SCORING_FIXTURE_ID) : undefined,
  predictions: {
    source: env.PREDICTIONS_SOURCE,
    file: env.PREDICTIONS_FILE || undefined,
  },
  refreshIntervalMs: env.REFRESH_INTERVAL_MS,
  redis: { url: env.REDIS_URL },
  mongo: { url: env.MONGO_URL || undefined, db: env.MONGO_DB },
  logLevel: env.LOG_LEVEL,
} as const;

export type Config = typeof config;
