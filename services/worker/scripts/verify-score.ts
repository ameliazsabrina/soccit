import { config } from "../src/config.js";
import { TokenManager } from "../src/txline/auth.js";
import { RawEvent } from "../src/txline/types.js";
import { normalize } from "../src/domain/normalize.js";

async function fetchUpdates(
  tokens: TokenManager,
  fixtureId: number,
): Promise<unknown[]> {
  const creds = await tokens.get();
  const res = await fetch(
    `${config.txline.baseUrl}/api/scores/updates/${fixtureId}`,
    {
      headers: {
        Authorization: `Bearer ${creds.jwt}`,
        "X-Api-Token": creds.apiToken,
      },
    },
  );
  if (!res.ok)
    throw new Error(`updates ${fixtureId}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const body = JSON.parse(text) as unknown;
    return Array.isArray(body) ? body : [body];
  }
  const out: unknown[] = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.replace(/^data:\s*/, "").trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s) as { data?: unknown };
      out.push(obj.data ?? obj);
    } catch {
      /* skip non-JSON line */
    }
  }
  return out;
}

async function main(): Promise<void> {
  const fixtureId = Number(process.argv[2]);
  if (!fixtureId) throw new Error("usage: verify-score.ts <fixtureId>");

  const tokens = new TokenManager();
  const raw = await fetchUpdates(tokens, fixtureId);
  console.log(`fixture ${fixtureId}: ${raw.length} raw events`);

  let lastStats:
    | { g1: number; g2: number; action?: string; seq?: number }
    | undefined;
  let terminalScore:
    | { goals1?: number; goals2?: number; action?: string }
    | undefined;

  for (const r of raw) {
    const parsed = RawEvent.safeParse(r);
    if (!parsed.success) continue;
    const ev = parsed.data;

    // Track the last event that carried a Stats-derived score (the running FT score).
    if (ev.Stats && (ev.Stats["1"] != null || ev.Stats["2"] != null)) {
      lastStats = {
        g1: ev.Stats["1"] ?? 0,
        g2: ev.Stats["2"] ?? 0,
        action: ev.Action,
        seq: ev.Seq,
      };
    }

    // The production grading path: goals attached to the terminal status event.
    for (const dom of normalize(parsed.data)) {
      if (dom.type === "status" && dom.terminal) {
        terminalScore = {
          goals1: dom.goals1,
          goals2: dom.goals2,
          action: dom.action,
        };
      }
    }
  }

  console.log("\n--- what scoring will grade against ---");
  if (terminalScore) {
    console.log(
      `terminal status (${terminalScore.action}) → score1=${terminalScore.goals1} score2=${terminalScore.goals2}`,
    );
  } else {
    console.log(
      "no terminal status event found (fixture may not be finished, or no game_finalised in replay)",
    );
  }
  console.log(
    `last Stats-derived score → score1=${lastStats?.g1} score2=${lastStats?.g2} (from ${lastStats?.action} Seq=${lastStats?.seq})`,
  );
  console.log(
    "\n⚠️  Cross-check score1/score2 against this fixture's REAL full-time result.\n" +
      '   If they DON\'T match, the Stats["1"]/["2"] mapping is wrong — fall back to\n' +
      "   parsing the snapshot's scoreSoccer field before trusting this for payouts.",
  );
}

main().catch((err) => {
  console.error("verify-score failed:", err);
  process.exit(1);
});
