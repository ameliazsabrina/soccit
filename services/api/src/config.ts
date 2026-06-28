import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const Schema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),
  PROGRAM_ID: z.string().default("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v"),
  SSE_KEEPALIVE_MS: z.coerce.number().int().positive().default(15000),
  STREAM_BLOCK_MS: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.string().default("info"),
});

const env = Schema.parse(process.env);

export const config = {
  port: env.PORT,
  host: env.HOST,
  redis: { url: env.REDIS_URL },
  solana: { rpcUrl: env.SOLANA_RPC_URL, programId: env.PROGRAM_ID },
  sseKeepaliveMs: env.SSE_KEEPALIVE_MS,
  streamBlockMs: env.STREAM_BLOCK_MS,
  logLevel: env.LOG_LEVEL,
} as const;

export type Config = typeof config;
