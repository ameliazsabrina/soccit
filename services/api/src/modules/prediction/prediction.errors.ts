export class MatchNotOpenError extends Error {
  constructor(fixtureId: number, statusLabel: string) {
    super(`Match ${fixtureId} is not open for predictions (status: ${statusLabel})`);
    this.name = "MatchNotOpenError";
  }
}
