import { readFile } from "node:fs/promises";
import { Connection } from "@solana/web3.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { PredictionsUnavailableError } from "../leaderboard/leaderboard.errors.js";
import { predictionSchema, type Prediction } from "../leaderboard/leaderboard.schema.js";
import { decodePrediction, fetchPredictionAccounts } from "./program.js";

export interface PredictionSource {
  load(fixtureId: number): Promise<Prediction[]>;
}

class OnchainSource implements PredictionSource {
  private conn = new Connection(config.solana.rpcUrl, "confirmed");

  async load(fixtureId: number): Promise<Prediction[]> {
    const raw = await fetchPredictionAccounts(this.conn, fixtureId);
    const out: Prediction[] = [];
    for (const buf of raw) {
      const parsed = predictionSchema.safeParse(decodePrediction(buf));
      if (parsed.success) out.push(parsed.data);
      else logger.warn({ err: parsed.error.message }, "skipping malformed prediction account");
    }
    return out;
  }
}

class FileSource implements PredictionSource {
  constructor(private readonly path: string) {}

  async load(): Promise<Prediction[]> {
    const text = await readFile(this.path, "utf8");
    const parsed = predictionSchema.array().safeParse(JSON.parse(text));
    if (!parsed.success) throw new PredictionsUnavailableError(parsed.error.message);
    return parsed.data;
  }
}

export function createPredictionSource(): PredictionSource {
  if (config.predictions.source === "file") {
    if (!config.predictions.file) throw new PredictionsUnavailableError("PREDICTIONS_FILE unset");
    return new FileSource(config.predictions.file);
  }
  return new OnchainSource();
}
