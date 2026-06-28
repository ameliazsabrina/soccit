import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { appRouter } from "./server/root.js";
import { getMatchState } from "./modules/match/match.service.js";
import { MatchNotFoundError } from "./modules/match/match.errors.js";
import { getLeaderboard, leaderboardKey } from "./modules/leaderboard/leaderboard.service.js";
import { LeaderboardNotReadyError } from "./modules/leaderboard/leaderboard.errors.js";
import { getLineup, loadPlayerIndex } from "./modules/lineup/lineup.service.js";
import { LineupNotReadyError } from "./modules/lineup/lineup.errors.js";
import { backfill, enrichEntry, tail } from "./modules/events/events.service.js";
import { getRedis, newRedisConnection } from "./redis.js";
import { subscribeChannel } from "./pubsub.js";

const app = new Hono();

app.use("*", cors());

app.get("/healthz", (c) => c.json({ ok: true }));

app.all("/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({ signal: c.req.raw.signal }),
  }),
);

function parseFixtureId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

app.get("/api/match/:id", async (c) => {
  const fixtureId = parseFixtureId(c.req.param("id"));
  if (fixtureId === null) return c.json({ error: "invalid fixtureId" }, 400);
  try {
    return c.json(await getMatchState(fixtureId));
  } catch (err) {
    if (err instanceof MatchNotFoundError) return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.get("/api/leaderboard/:id", async (c) => {
  const fixtureId = parseFixtureId(c.req.param("id"));
  if (fixtureId === null) return c.json({ error: "invalid fixtureId" }, 400);
  try {
    return c.json(await getLeaderboard(fixtureId));
  } catch (err) {
    if (err instanceof LeaderboardNotReadyError) return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.get("/api/lineup/:id", async (c) => {
  const fixtureId = parseFixtureId(c.req.param("id"));
  if (fixtureId === null) return c.json({ error: "invalid fixtureId" }, 400);
  try {
    return c.json(await getLineup(fixtureId));
  } catch (err) {
    if (err instanceof LineupNotReadyError) return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.get("/api/events/:id", (c) => {
  const fixtureId = parseFixtureId(c.req.param("id"));
  if (fixtureId === null) return c.json({ error: "invalid fixtureId" }, 400);
  const fromId = c.req.header("Last-Event-ID") ?? c.req.query("fromId") ?? "0-0";
  const signal = c.req.raw.signal;

  return streamSSE(c, async (stream) => {
    const keepalive = setInterval(() => void stream.writeln(": keepalive"), config.sseKeepaliveMs);
    const reader = newRedisConnection();
    let index = await loadPlayerIndex(fixtureId);
    let cursor = fromId;
    try {
      for (const entry of await backfill(reader, fixtureId, cursor)) {
        cursor = entry.id;
        const enriched = enrichEntry(entry, index);
        await stream.writeSSE({ id: entry.id, event: entry.type, data: JSON.stringify(enriched) });
      }
      for await (const entry of tail(fixtureId, cursor, signal)) {
        if (entry.type === "substitution" && index.size === 0) index = await loadPlayerIndex(fixtureId);
        const enriched = enrichEntry(entry, index);
        await stream.writeSSE({ id: entry.id, event: entry.type, data: JSON.stringify(enriched) });
      }
    } finally {
      clearInterval(keepalive);
      reader.disconnect();
    }
  });
});

app.get("/api/leaderboard/:id/stream", (c) => {
  const fixtureId = parseFixtureId(c.req.param("id"));
  if (fixtureId === null) return c.json({ error: "invalid fixtureId" }, 400);
  const signal = c.req.raw.signal;

  return streamSSE(c, async (stream) => {
    const keepalive = setInterval(() => void stream.writeln(": keepalive"), config.sseKeepaliveMs);
    try {
      const initial = await getRedis().get(leaderboardKey(fixtureId));
      if (initial) await stream.writeSSE({ event: "leaderboard", data: initial });
      for await (const message of subscribeChannel(leaderboardKey(fixtureId), signal)) {
        await stream.writeSSE({ event: "leaderboard", data: message });
      }
    } finally {
      clearInterval(keepalive);
    }
  });
});

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  logger.info({ port: info.port, host: config.host }, "soccit api listening");
});

export { app };
