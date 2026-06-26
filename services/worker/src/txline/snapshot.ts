import { config } from "../config.js";
import type { TokenManager } from "./auth.js";
import { RawEvent } from "./types.js";

export async function fetchSnapshot(
  tokens: TokenManager,
  fixtureId: number,
  asOf?: number,
): Promise<RawEvent[]> {
  const creds = await tokens.get();
  const url = new URL(
    `${config.txline.baseUrl}/api/scores/snapshot/${fixtureId}`,
  );
  if (asOf != null) url.searchParams.set("asOf", String(asOf));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${creds.jwt}`,
      "X-Api-Token": creds.apiToken,
    },
  });
  if (res.status === 401) {
    await tokens.refresh();
    return fetchSnapshot(tokens, fixtureId, asOf);
  }
  if (!res.ok) {
    throw new Error(
      `snapshot ${fixtureId} failed: ${res.status} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as unknown;
  const arr = Array.isArray(body) ? body : [body];
  const out: RawEvent[] = [];
  for (const item of arr) {
    const parsed = RawEvent.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
