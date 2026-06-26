export class MatchNotFoundError extends Error {
  constructor(fixtureId: number) {
    super(`No on-chain match for fixture ${fixtureId}`);
    this.name = "MatchNotFoundError";
  }
}

export class PredictionsUnavailableError extends Error {
  constructor(reason: string) {
    super(`Predictions unavailable: ${reason}`);
    this.name = "PredictionsUnavailableError";
  }
}
