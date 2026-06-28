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
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("0.0.0.0"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  HELIUS_API_KEY: heliusApiKey,
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
  solana: { rpcUrl: heliusDevnetRpcUrl(env.HELIUS_API_KEY), programId: env.PROGRAM_ID },
  sseKeepaliveMs: env.SSE_KEEPALIVE_MS,
  streamBlockMs: env.STREAM_BLOCK_MS,
  logLevel: env.LOG_LEVEL,
} as const;

export type Config = typeof config;
