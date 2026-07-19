import { z } from "zod";
import { config } from "../config.js";
import type { TokenManager } from "./auth.js";

export const Fixture = z
  .object({
    FixtureId: z.number(),
    Competition: z.string().optional(),
    CompetitionId: z.number().optional(),
    Participant1: z.string().optional(),
    Participant2: z.string().optional(),
    Participant1Id: z.number().optional(),
    Participant2Id: z.number().optional(),
    StartTime: z.number().optional(),
  })
  .passthrough();

export type Fixture = z.infer<typeof Fixture>;

export async function listFixtures(
  tokens: TokenManager,
  epochDay?: number,
): Promise<Fixture[]> {
  const creds = await tokens.get();
  const url = new URL(`${config.txline.baseUrl}/api/fixtures/snapshot`);
  if (epochDay != null) url.searchParams.set("epochDay", String(epochDay));

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${creds.jwt}`,
      "X-Api-Token": creds.apiToken,
    },
  });
  if (res.status === 401) {
    await tokens.refresh();
    return listFixtures(tokens, epochDay);
  }
  if (!res.ok) {
    throw new Error(`fixtures/snapshot failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as unknown;
  const arr = Array.isArray(body) ? body : [body];
  const out: Fixture[] = [];
  for (const item of arr) {
    const parsed = Fixture.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
