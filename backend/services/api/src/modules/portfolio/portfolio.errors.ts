export class RpcUnavailableError extends Error {
  constructor(message = "Solana RPC unavailable") {
    super(message);
    this.name = "RpcUnavailableError";
  }
}
