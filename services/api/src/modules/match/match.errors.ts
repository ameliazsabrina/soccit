export class MatchNotFoundError extends Error {
  constructor(fixtureId: number) {
    super(`No match found for fixture ${fixtureId}`);
    this.name = "MatchNotFoundError";
  }
}
