export class LineupNotReadyError extends Error {
  constructor(fixtureId: number) {
    super(`No lineup available yet for fixture ${fixtureId}`);
    this.name = "LineupNotReadyError";
  }
}
