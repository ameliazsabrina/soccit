export class InvalidSignatureError extends Error {
  constructor() {
    super("Wallet signature verification failed");
    this.name = "InvalidSignatureError";
  }
}

export class UsernameTakenError extends Error {
  constructor(username: string) {
    super(`Username ${username} is already taken`);
    this.name = "UsernameTakenError";
  }
}

export class WalletAlreadyRegisteredError extends Error {
  constructor(wallet: string) {
    super(`Wallet ${wallet} already has a profile`);
    this.name = "WalletAlreadyRegisteredError";
  }
}

export class UserNotFoundError extends Error {
  constructor(wallet: string) {
    super(`No profile found for wallet ${wallet}`);
    this.name = "UserNotFoundError";
  }
}
