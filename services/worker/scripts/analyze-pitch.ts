// One-off: inspect the REAL shape & semantics of players_on_the_pitch /
// players_warming_up beats from the live TxLINE updates feed, to settle whether
// players_on_the_pitch is authoritative (full current set) or incremental.
//   pnpm tsx scripts/analyze-pitch.ts <fixtureId> [--save <path>]
import { writeFileSync } from "node:fs";
import { config } from "../src/config.js";
import { TokenManager } from "../src/txline/auth.js";

async function fetchUpdates(tokens: TokenManager, fixtureId: number): Promise<any[]> {
  const creds = await tokens.get();
  const res = await fetch(`${config.txline.baseUrl}/api/scores/updates/${fixtureId}`, {
    headers: { Authorization: `Bearer ${creds.jwt}`, "X-Api-Token": creds.apiToken },
  });
  if (!res.ok) throw new Error(`updates ${fixtureId}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const body = JSON.parse(text) as unknown;
    return Array.isArray(body) ? body : [body];
  }
  // SSE / NDJSON: one "data: {json}" (or bare {json}) per line.
  const out: any[] = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.replace(/^data:\s*/, "").trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      out.push(obj.data ?? obj);
    } catch {}
  }
  return out;
}

async function liveWatch(fixtureId: number, ms: number): Promise<void> {
  const { streamScores } = await import("../src/txline/stream.js");
  const tokens = new TokenManager();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const watched = new Set(["players_on_the_pitch", "players_warming_up", "jersey", "substitution"]);
  console.log(`live-watching fixture ${fixtureId} for ${ms / 1000}s — logging ${[...watched].join(", ")} beats...`);
  let count = 0;
  try {
    for await (const raw of streamScores({ tokens, fixtureId, signal: controller.signal })) {
      count++;
      if (process.env.ALL) console.log(`  · ${raw.Action} (Seq=${raw.Seq})`);
      if (raw.Action && watched.has(raw.Action)) {
        console.log(`\n[${raw.Action}] Seq=${raw.Seq} Clock=${raw.Clock?.Seconds}s ids=${JSON.stringify(extractIds(raw.Data))}`);
        console.log("  Data:", JSON.stringify(raw.Data));
      }
    }
  } finally {
    clearTimeout(timer);
  }
  console.log(`\nlive watch ended — ${count} total beats seen`);
}

async function main(): Promise<void> {
  const fixtureId = Number(process.argv[2]);
  if (!fixtureId) throw new Error("usage: analyze-pitch.ts <fixtureId> [--live <seconds>] [--save <path>]");
  const liveIdx = process.argv.indexOf("--live");
  if (liveIdx !== -1) {
    await liveWatch(fixtureId, (Number(process.argv[liveIdx + 1]) || 75) * 1000);
    return;
  }
  const tokens = new TokenManager();
  const all = await fetchUpdates(tokens, fixtureId);
  console.log(`fixture ${fixtureId}: ${all.length} raw events`);

  const hist: Record<string, number> = {};
  for (const e of all) hist[e.Action ?? "?"] = (hist[e.Action ?? "?"] ?? 0) + 1;
  console.log("action histogram:", JSON.stringify(hist, null, 0));

  const pitch = all.filter((e) => e.Action === "players_on_the_pitch");
  const warming = all.filter((e) => e.Action === "players_warming_up");
  console.log(`\nplayers_on_the_pitch beats: ${pitch.length}; players_warming_up beats: ${warming.length}`);

  if (pitch.length > 0) {
    console.log("\n--- first players_on_the_pitch FULL raw event ---");
    console.log(JSON.stringify(pitch[0], null, 2));
    const sizes = pitch.map((e) => idCount(e.Data));
    console.log(`\nplayer-id counts per beat: ${JSON.stringify(sizes)}`);
    // authoritative full set ≈ 11 per side (22) or 11 if per-team; incremental ≈ 1-2.
  }
  if (warming.length > 0) {
    console.log("\n--- first players_warming_up Data (raw) ---");
    console.log(JSON.stringify(warming[0].Data, null, 2));
  }

  const jersey = all.filter((e) => e.Action === "jersey");
  console.log(`\njersey beats: ${jersey.length}`);
  jersey.forEach((j, i) => {
    console.log(`\n--- jersey beat #${i} FULL raw event ---`);
    console.log(JSON.stringify(j, null, 2));
  });

  const saveIdx = process.argv.indexOf("--save");
  if (saveIdx !== -1 && pitch[0]) {
    const path = process.argv[saveIdx + 1]!;
    writeFileSync(
      path,
      JSON.stringify(
        { players_on_the_pitch: pitch[0], players_warming_up: warming[0] ?? null, jersey: jersey[0] ?? null },
        null,
        2,
      ) + "\n",
    );
    console.log(`\nsaved real pre-kickoff beats -> ${path}`);
  }

  // Around each substitution, does the next players_on_the_pitch DROP the subbed-off player?
  console.log("\n--- subbed-off vs subsequent on-pitch sets ---");
  for (let i = 0; i < all.length; i++) {
    const e = all[i];
    if (e.Action !== "substitution" || e.Data?.PlayerOutId == null) continue;
    const off = e.Data.PlayerOutId;
    const next = all.slice(i + 1).find((x) => x.Action === "players_on_the_pitch");
    if (!next) continue;
    const ids = extractIds(next.Data);
    console.log(
      `sub off=${off} (in=${e.Data.PlayerInId})  next on-pitch size=${ids.length}  off-still-present=${ids.includes(off)}`,
    );
  }
}

function extractIds(data: unknown): number[] {
  const ids = new Set<number>();
  const visit = (v: unknown) => {
    if (typeof v === "number") ids.add(v);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (/player.?id|normativeId|^id$/i.test(k) && typeof val === "number") ids.add(val);
        else visit(val);
      }
    }
  };
  visit(data);
  return [...ids];
}
const idCount = (data: unknown) => extractIds(data).length;

main().catch((err) => {
  console.error("analyze-pitch failed:", err);
  process.exit(1);
});
