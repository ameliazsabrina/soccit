export const MATCH_DISCRIMINATOR = Buffer.from([
  236, 63, 169, 38, 15, 56, 196, 162,
]);
export const MATCH_ACCOUNT_LEN = 249;
const MATCH_STATUS_OFFSET = 40;
const MATCH_SETTLED_OFFSET = 42;
const STATUS_OPEN = 0;

export interface RawMatchAccount {
  pubkey: string;
  data: Buffer;
}

export function selectActiveFixtureIds(
  accounts: RawMatchAccount[],
  excluded: ReadonlySet<string> = new Set(),
): number[] {
  const ids: number[] = [];
  for (const { pubkey, data } of accounts) {
    if (data.length < MATCH_ACCOUNT_LEN) continue;
    if (!data.subarray(0, 8).equals(MATCH_DISCRIMINATOR)) continue;
    if (excluded.has(pubkey)) continue;
    const settled = data.readUInt8(MATCH_SETTLED_OFFSET) === 1;
    const status = data.readUInt8(MATCH_STATUS_OFFSET);
    if (settled || status !== STATUS_OPEN) continue;
    ids.push(Number(data.readBigUInt64LE(8)));
  }
  return ids;
}
