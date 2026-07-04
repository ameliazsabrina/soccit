export class MatchNotOpenError extends Error {
  constructor(fixtureId: number, statusLabel: string) {
    super(
      `Match ${fixtureId} is not open for predictions (status: ${statusLabel})`,
    );
    this.name = "MatchNotOpenError";
  }
}

export class EntryNotOpenYetError extends Error {
  readonly startTime: number;
  constructor(fixtureId: number, startTime: number) {
    super(
      `Entries for match ${fixtureId} open 10 minutes before kickoff (starts at ${startTime})`,
    );
    this.name = "EntryNotOpenYetError";
    this.startTime = startTime;
  }
}
