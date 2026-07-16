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

export class MatchNotEnteredError extends Error {
  readonly wallet: string;
  constructor(fixtureId: number, wallet: string) {
    super(
      `Wallet ${wallet} must enter match ${fixtureId} (pay the entry fee) before predicting`,
    );
    this.name = "MatchNotEnteredError";
    this.wallet = wallet;
  }
}

export class MatchMintMismatchError extends Error {
  readonly expectedMint: string;
  readonly actualMint: string;
  constructor(fixtureId: number, expectedMint: string, actualMint: string) {
    super(
      `Match ${fixtureId} was created against USDC mint ${actualMint}, not the ` +
        `supported mint ${expectedMint}; it cannot accept predictions and must be recreated`,
    );
    this.name = "MatchMintMismatchError";
    this.expectedMint = expectedMint;
    this.actualMint = actualMint;
  }
}

export class InsufficientEntryBalanceError extends Error {
  readonly required: string;
  readonly available: string;
  readonly mint: string;
  constructor(
    fixtureId: number,
    required: bigint,
    available: bigint,
    mint: string,
  ) {
    super(
      `Insufficient USDC balance to enter match ${fixtureId}: need ${required} ` +
        `base units of ${mint} but wallet holds ${available}`,
    );
    this.name = "InsufficientEntryBalanceError";
    this.required = required.toString();
    this.available = available.toString();
    this.mint = mint;
  }
}
