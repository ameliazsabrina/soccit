import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { appRouter } from "./server/root.js";
import { getMatchState, listMatches } from "./modules/match/match.service.js";
import { MatchNotFoundError } from "./modules/match/match.errors.js";
import { isValidPda, resolveFixtureId } from "./modules/match/pda.js";
import { leaderboardOutput } from "@soccit/scoring/leaderboard/schema";
import {
  enrichLeaderboard,
  getLeaderboard,
  leaderboardKey,
  parseLeaderboard,
} from "./modules/leaderboard/leaderboard.service.js";
import { LeaderboardNotReadyError } from "./modules/leaderboard/leaderboard.errors.js";
import { getLineup, loadPlayerIndex } from "./modules/lineup/lineup.service.js";
import { LineupNotReadyError } from "./modules/lineup/lineup.errors.js";
import {
  backfill,
  enrichEntry,
  tail,
} from "./modules/events/events.service.js";
import {
  registerInput,
  setAvatarInput,
  walletInput,
} from "./modules/user/user.schema.js";
import {
  getUser,
  listAvatars,
  loadUserProfiles,
  registerUser,
  setAvatar,
} from "./modules/user/user.service.js";
import { getUserMatches } from "./modules/participation/participation.service.js";
import { scheduleInput } from "./modules/schedule/schedule.schema.js";
import { listSchedule } from "./modules/schedule/schedule.service.js";
import { TxlineNotConfiguredError } from "./txline.js";
import { preparePredictionInput } from "./modules/prediction/prediction.schema.js";
import { preparePrediction } from "./modules/prediction/prediction.service.js";
import { MatchNotOpenError } from "./modules/prediction/prediction.errors.js";
import {
  InvalidSignatureError,
  UserNotFoundError,
  UsernameTakenError,
  WalletAlreadyRegisteredError,
} from "./modules/user/user.errors.js";
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

app.get("/api/matches", async (c) => c.json(await listMatches()));

app.get("/api/schedule", async (c) => {
  const toNum = (v: string | undefined) => (v == null ? undefined : Number(v));
  const parsed = scheduleInput.safeParse({
    startEpochDay: toNum(c.req.query("startEpochDay")),
    competitionId: toNum(c.req.query("competitionId")),
  });
  if (!parsed.success) return c.json({ error: "invalid query" }, 400);
  try {
    return c.json(await listSchedule(parsed.data));
  } catch (err) {
    if (err instanceof TxlineNotConfiguredError)
      return c.json({ error: err.message }, 503);
    throw err;
  }
});

app.get("/api/match/:pda", async (c) => {
  const pda = c.req.param("pda");
  if (!isValidPda(pda)) return c.json({ error: "invalid match address" }, 400);
  try {
    const fixtureId = await resolveFixtureId(pda);
    return c.json(await getMatchState(fixtureId));
  } catch (err) {
    if (err instanceof MatchNotFoundError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.post("/api/prediction/prepare", async (c) => {
  const parsed = preparePredictionInput.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);
  try {
    return c.json(await preparePrediction(parsed.data));
  } catch (err) {
    if (err instanceof MatchNotFoundError)
      return c.json({ error: err.message }, 404);
    if (err instanceof MatchNotOpenError)
      return c.json({ error: err.message }, 409);
    throw err;
  }
});

app.post("/api/user", async (c) => {
  const parsed = registerInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);
  try {
    return c.json(await registerUser(parsed.data));
  } catch (err) {
    if (err instanceof InvalidSignatureError)
      return c.json({ error: err.message }, 401);
    if (
      err instanceof UsernameTakenError ||
      err instanceof WalletAlreadyRegisteredError
    ) {
      return c.json({ error: err.message }, 409);
    }
    throw err;
  }
});

app.get("/api/user/:wallet", async (c) => {
  const parsed = walletInput.safeParse({ wallet: c.req.param("wallet") });
  if (!parsed.success) return c.json({ error: "invalid wallet" }, 400);
  try {
    return c.json(await getUser(parsed.data.wallet));
  } catch (err) {
    if (err instanceof UserNotFoundError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.patch("/api/user/:wallet/avatar", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = setAvatarInput.safeParse({
    ...(body ?? {}),
    wallet: c.req.param("wallet"),
  });
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);
  try {
    return c.json(await setAvatar(parsed.data));
  } catch (err) {
    if (err instanceof InvalidSignatureError)
      return c.json({ error: err.message }, 401);
    if (err instanceof UserNotFoundError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.get("/api/user/:wallet/matches", async (c) => {
  const parsed = walletInput.safeParse({ wallet: c.req.param("wallet") });
  if (!parsed.success) return c.json({ error: "invalid wallet" }, 400);
  return c.json(await getUserMatches(parsed.data.wallet));
});

app.get("/api/avatars", (c) => c.json(listAvatars()));

app.get("/api/leaderboard/:pda", async (c) => {
  const pda = c.req.param("pda");
  if (!isValidPda(pda)) return c.json({ error: "invalid match address" }, 400);
  try {
    const fixtureId = await resolveFixtureId(pda);
    return c.json(await getLeaderboard(fixtureId));
  } catch (err) {
    if (err instanceof MatchNotFoundError)
      return c.json({ error: err.message }, 404);
    if (err instanceof LeaderboardNotReadyError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.get("/api/lineup/:pda", async (c) => {
  const pda = c.req.param("pda");
  if (!isValidPda(pda)) return c.json({ error: "invalid match address" }, 400);
  try {
    const fixtureId = await resolveFixtureId(pda);
    return c.json(await getLineup(fixtureId));
  } catch (err) {
    if (err instanceof MatchNotFoundError)
      return c.json({ error: err.message }, 404);
    if (err instanceof LineupNotReadyError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.get("/api/events/:pda", async (c) => {
  const pda = c.req.param("pda");
  if (!isValidPda(pda)) return c.json({ error: "invalid match address" }, 400);
  let fixtureId: number;
  try {
    fixtureId = await resolveFixtureId(pda);
  } catch (err) {
    if (err instanceof MatchNotFoundError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
  const fromId =
    c.req.header("Last-Event-ID") ?? c.req.query("fromId") ?? "0-0";
  const signal = c.req.raw.signal;

  return streamSSE(c, async (stream) => {
    const keepalive = setInterval(
      () => void stream.writeln(": keepalive"),
      config.sseKeepaliveMs,
    );
    const reader = newRedisConnection();
    let index = await loadPlayerIndex(fixtureId);
    let cursor = fromId;
    try {
      for (const entry of await backfill(reader, fixtureId, cursor)) {
        cursor = entry.id;
        const enriched = enrichEntry(entry, index);
        await stream.writeSSE({
          id: entry.id,
          event: entry.type,
          data: JSON.stringify(enriched),
        });
      }
      for await (const entry of tail(fixtureId, cursor, signal)) {
        if (entry.type === "substitution" && index.size === 0)
          index = await loadPlayerIndex(fixtureId);
        const enriched = enrichEntry(entry, index);
        await stream.writeSSE({
          id: entry.id,
          event: entry.type,
          data: JSON.stringify(enriched),
        });
      }
    } finally {
      clearInterval(keepalive);
      reader.disconnect();
    }
  });
});

app.get("/api/leaderboard/:pda/stream", async (c) => {
  const pda = c.req.param("pda");
  if (!isValidPda(pda)) return c.json({ error: "invalid match address" }, 400);
  let fixtureId: number;
  try {
    fixtureId = await resolveFixtureId(pda);
  } catch (err) {
    if (err instanceof MatchNotFoundError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
  const signal = c.req.raw.signal;

  return streamSSE(c, async (stream) => {
    const keepalive = setInterval(
      () => void stream.writeln(": keepalive"),
      config.sseKeepaliveMs,
    );
    let index = await loadPlayerIndex(fixtureId);
    const enrich = async (board: ReturnType<typeof parseLeaderboard>) => {
      if (index.size === 0) index = await loadPlayerIndex(fixtureId);
      const users = await loadUserProfiles(board.ranking.map((e) => e.owner));
      return enrichLeaderboard(board, index, users);
    };
    try {
      const initial = await getRedis().get(leaderboardKey(fixtureId));
      if (initial) {
        const enriched = await enrich(
          leaderboardOutput.parse(JSON.parse(initial)),
        );
        await stream.writeSSE({
          event: "leaderboard",
          data: JSON.stringify(enriched),
        });
      }
      for await (const message of subscribeChannel(
        leaderboardKey(fixtureId),
        signal,
      )) {
        const enriched = await enrich(parseLeaderboard(message, fixtureId));
        await stream.writeSSE({
          event: "leaderboard",
          data: JSON.stringify(enriched),
        });
      }
    } finally {
      clearInterval(keepalive);
    }
  });
});

if (process.env.NODE_ENV !== "test") {
  serve(
    { fetch: app.fetch, port: config.port, hostname: config.host },
    (info) => {
      logger.info({ port: info.port, host: config.host }, "soccit api listening");
    },
  );
}

export { app };
