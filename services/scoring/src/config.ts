import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const Schema = z.object({
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),
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
    rpcUrl: env.SOLANA_RPC_URL,
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
