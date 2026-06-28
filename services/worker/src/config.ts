import { homedir } from "node:os";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return resolve(homedir(), p.slice(2));
  return p;
}

function heliusDevnetRpcUrl(apiKey: string): string {
  return `https://devnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
}

const heliusApiKey = process.env.NODE_ENV === "test"
  ? z.string().default("test")
  : z.string().min(1, "HELIUS_API_KEY is required");

const csv = (s: string): number[] =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));

const Schema = z.object({
  TXLINE_BASE_URL: z.string().url().default("https://txline.txodds.com"),
  TXLINE_LEAGUES: z.string().default(""),
  TXLINE_API_TOKEN: z.string().optional(),
  TXLINE_TX_SIG: z.string().optional(),
  SOLANA_KEYPAIR_PATH: z.string().default("~/.config/solana/soccit-txline.json"),
  HELIUS_API_KEY: heliusApiKey,
  TXLINE_FIXTURE_ID: z.string().optional(),
  TERMINAL_ACTIONS: z.string().default("game_finalised"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  MONGO_URL: z.string().optional(),
  MONGO_DB: z.string().default("soccit"),
  LOG_LEVEL: z.string().default("info"),
});

const env = Schema.parse(process.env);

export const config = {
  txline: {
    baseUrl: env.TXLINE_BASE_URL.replace(/\/$/, ""),
    leagues: csv(env.TXLINE_LEAGUES),
    apiToken: env.TXLINE_API_TOKEN || undefined,
    txSig: env.TXLINE_TX_SIG || undefined,
    fixtureId: env.TXLINE_FIXTURE_ID ? Number(env.TXLINE_FIXTURE_ID) : undefined,
  },
  solana: {
    keypairPath: expandHome(env.SOLANA_KEYPAIR_PATH),
    rpcUrl: heliusDevnetRpcUrl(env.HELIUS_API_KEY),
  },
  terminalActions: new Set(
    env.TERMINAL_ACTIONS.split(",").map((x) => x.trim()).filter(Boolean),
  ),
  redis: { url: env.REDIS_URL },
  mongo: { url: env.MONGO_URL || undefined, db: env.MONGO_DB },
  logLevel: env.LOG_LEVEL,
} as const;

export type Config = typeof config;
