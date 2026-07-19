export class WalletAlreadyEnteredError extends Error {
  readonly wallet: string;
  constructor(fixtureId: number, wallet: string) {
    super(`Wallet ${wallet} has already entered match ${fixtureId}`);
    this.name = "WalletAlreadyEnteredError";
    this.wallet = wallet;
  }
}
