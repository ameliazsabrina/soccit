import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

function heliusDevnetRpcUrl(apiKey: string): string {
  return `https://devnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
}

const heliusApiKey = process.env.NODE_ENV === "test"
  ? z.string().default("test")
  : z.string().min(1, "HELIUS_API_KEY is required");

const Schema = z.object({
  HELIUS_API_KEY: heliusApiKey,
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

export const config = {
  solana: {
    rpcUrl: heliusDevnetRpcUrl(env.HELIUS_API_KEY),
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
