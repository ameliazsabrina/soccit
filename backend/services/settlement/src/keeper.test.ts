import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { sendAndConfirmWithRetry, type KeeperDeps } from "./keeper.js";

function deps(connection: Partial<KeeperDeps["connection"]>): KeeperDeps {
  return {
    connection: connection as KeeperDeps["connection"],
    programId: PublicKey.unique(),
    resolver: Keypair.generate(),
    platformWallet: PublicKey.unique(),
    sendRetries: 3,
    sendRetryBaseMs: 0,
  };
}

describe("sendAndConfirmWithRetry", () => {
  it("retries send/confirm failures and returns the confirmed signature", async () => {
    const sendTransaction = vi
      .fn()
      .mockRejectedValueOnce(new Error("rpc busy"))
      .mockResolvedValueOnce("sig-ok");
    const confirmTransaction = vi.fn().mockResolvedValueOnce({ value: { err: null } });

    await expect(
      sendAndConfirmWithRetry(deps({ sendTransaction, confirmTransaction }), new Transaction()),
    ).resolves.toBe("sig-ok");
    expect(sendTransaction).toHaveBeenCalledTimes(2);
    expect(confirmTransaction).toHaveBeenCalledWith("sig-ok", "confirmed");
  });

  it("throws the final error after exhausting attempts", async () => {
    const err = new Error("still down");
    const sendTransaction = vi.fn().mockRejectedValue(err);
    const confirmTransaction = vi.fn();

    await expect(
      sendAndConfirmWithRetry(deps({ sendTransaction, confirmTransaction }), new Transaction()),
    ).rejects.toBe(err);
    expect(sendTransaction).toHaveBeenCalledTimes(3);
    expect(confirmTransaction).not.toHaveBeenCalled();
  });
});
