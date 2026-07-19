import { describe, expect, it } from "vitest";
import { selectActiveFixtureIds, type RawMatchAccount } from "./matches.js";

const MATCH_DISCRIMINATOR = Buffer.from([236, 63, 169, 38, 15, 56, 196, 162]);

function matchAccount(
  matchId: number,
  status: number,
  settled: number,
): Buffer {
  const buf = Buffer.alloc(249);
  MATCH_DISCRIMINATOR.copy(buf, 0);
  buf.writeBigUInt64LE(BigInt(matchId), 8);
  buf.writeUInt8(status, 40);
  buf.writeUInt8(settled, 42);
  return buf;
}

const acct = (pubkey: string, data: Buffer): RawMatchAccount => ({
  pubkey,
  data,
});

describe("selectActiveFixtureIds", () => {
  it("returns OPEN, unsettled fixtureIds and skips RESOLVED/SETTLED", () => {
    const accounts = [
      acct("open1", matchAccount(111, 0, 0)), // OPEN → in
      acct("resolved", matchAccount(222, 1, 0)), // RESOLVED → out
      acct("settled", matchAccount(333, 2, 1)), // SETTLED → out
    ];
    expect(selectActiveFixtureIds(accounts)).toEqual([111]);
  });

  it("excludes matches whose PDA is in the excluded set", () => {
    const accounts = [
      acct("keep", matchAccount(111, 0, 0)),
      acct("HIDExPDA", matchAccount(999, 0, 0)), // OPEN but excluded
    ];
    expect(selectActiveFixtureIds(accounts, new Set(["HIDExPDA"]))).toEqual([
      111,
    ]);
  });

  it("ignores accounts with the wrong discriminator or short data (untrusted input)", () => {
    const wrongDisc = Buffer.alloc(249);
    wrongDisc.writeBigUInt64LE(444n, 8);
    const tooShort = matchAccount(555, 0, 0).subarray(0, 100);
    const accounts = [
      acct("good", matchAccount(111, 0, 0)),
      acct("baddisc", wrongDisc),
      acct("short", tooShort),
    ];
    expect(selectActiveFixtureIds(accounts)).toEqual([111]);
  });
});
