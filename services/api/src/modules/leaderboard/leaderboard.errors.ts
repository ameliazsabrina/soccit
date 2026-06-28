export class LeaderboardNotReadyError extends Error {
  constructor(fixtureId: number) {
    super(`No leaderboard available yet for fixture ${fixtureId}`);
    this.name = "LeaderboardNotReadyError";
  }
}
