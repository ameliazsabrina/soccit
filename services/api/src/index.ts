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
  setUsernameInput,
  walletInput,
} from "./modules/user/user.schema.js";
import {
  getUser,
  listAvatars,
  loadUserProfiles,
  registerUser,
  setAvatar,
  setUsername,
} from "./modules/user/user.service.js";
import { sessionInput } from "./modules/auth/auth.schema.js";
import { createSession, issueToken } from "./modules/auth/auth.service.js";
import { requireWallet } from "./modules/auth/auth.middleware.js";
import {
  InvalidSessionRequestError,
  SessionConfigError,
  UnauthorizedError,
} from "./modules/auth/auth.errors.js";
import { getUserMatches } from "./modules/participation/participation.service.js";
import { getPlatformConfig } from "./modules/config/config.service.js";
import { listCompetitions } from "./modules/competitions/competitions.service.js";
import { getBracket } from "./modules/bracket/bracket.service.js";
import { BracketNotFoundError } from "./modules/bracket/bracket.errors.js";
import { getAsset } from "./modules/assets/assets.service.js";
import { scheduleInput } from "./modules/schedule/schedule.schema.js";
import { listSchedule } from "./modules/schedule/schedule.service.js";
import { TxlineNotConfiguredError } from "./txline.js";
import { preparePredictionInput } from "./modules/prediction/prediction.schema.js";
import { preparePrediction } from "./modules/prediction/prediction.service.js";
import {
  EntryNotOpenYetError,
  MatchNotOpenError,
} from "./modules/prediction/prediction.errors.js";
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

const WORKER_HEARTBEAT_KEY = "txline:worker:heartbeat";
const LAST_BEAT_AT_KEY = "txline:scores:lastBeatAt";
const WORKER_ALIVE_WINDOW_MS = 35_000;

app.get("/healthz", async (c) => {
  let worker: { alive: boolean; heartbeatAgeMs: number | null } | null = null;
  let feed: { lastBeatAgeMs: number | null } | null = null;
  try {
    const redis = getRedis();
    const [hb, beat] = await Promise.all([
      redis.get(WORKER_HEARTBEAT_KEY),
      redis.get(LAST_BEAT_AT_KEY),
    ]);
    const now = Date.now();
    const ageOf = (v: string | null) => (v == null ? null : now - Number(v));
    const heartbeatAgeMs = ageOf(hb);
    worker = {
      alive: heartbeatAgeMs != null && heartbeatAgeMs < WORKER_ALIVE_WINDOW_MS,
      heartbeatAgeMs,
    };
    feed = { lastBeatAgeMs: ageOf(beat) };
  } catch {
    // Redis unavailable — surface unknown worker/feed state, API is still up.
  }
  return c.json({ ok: true, worker, feed });
});

app.all("/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({ signal: c.req.raw.signal }),
  }),
);

app.get("/api/config", (c) => c.json(getPlatformConfig()));

app.get("/api/competitions", (c) => c.json(listCompetitions()));

// NB: a dedicated path (NOT /api/events/bracket) — the SSE route
// `GET /api/events/:pda` would otherwise swallow it.
app.get("/api/competitions/:slug/bracket", async (c) => {
  try {
    return c.json(await getBracket(c.req.param("slug")));
  } catch (err) {
    if (err instanceof BracketNotFoundError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});

const ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";
app.get("/api/assets/:path{.+}", async (c) => {
  const path = c.req.param("path");
  const asset = await getAsset(path);
  if (!asset) return c.json({ error: "asset not found" }, 404);
  const etag = `"${asset.etag}"`;
  if (c.req.header("If-None-Match") === etag) {
    return c.body(null, 304, {
      ETag: etag,
      "Cache-Control": ASSET_CACHE_CONTROL,
    });
  }
  return c.body(asset.body.buffer as ArrayBuffer, 200, {
    "Content-Type": asset.contentType,
    "Cache-Control": ASSET_CACHE_CONTROL,
    ETag: etag,
  });
});

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
    if (err instanceof MatchNotOpenError || err instanceof EntryNotOpenYetError)
      return c.json({ error: err.message }, 409);
    throw err;
  }
});

app.post("/api/auth/session", async (c) => {
  const parsed = sessionInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);
  try {
    return c.json(createSession(parsed.data));
  } catch (err) {
    if (err instanceof InvalidSessionRequestError)
      return c.json({ error: err.message }, 401);
    if (err instanceof SessionConfigError)
      return c.json({ error: err.message }, 503);
    throw err;
  }
});

app.post("/api/user", async (c) => {
  const parsed = registerInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);
  try {
    const profile = await registerUser(parsed.data);
    // Issue a session immediately so a new user needn't re-sign to edit.
    const session = config.session.secret ? issueToken(profile.wallet) : null;
    return c.json({ ...profile, session });
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
  try {
    requireWallet(c);
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return c.json({ error: err.message }, 401);
    throw err;
  }
  const body = await c.req.json().catch(() => null);
  const parsed = setAvatarInput.safeParse({
    ...(body ?? {}),
    wallet: c.req.param("wallet"),
  });
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);
  try {
    return c.json(await setAvatar(parsed.data));
  } catch (err) {
    if (err instanceof UserNotFoundError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});

app.patch("/api/user/:wallet/username", async (c) => {
  try {
    requireWallet(c);
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return c.json({ error: err.message }, 401);
    throw err;
  }
  const body = await c.req.json().catch(() => null);
  const parsed = setUsernameInput.safeParse({
    ...(body ?? {}),
    wallet: c.req.param("wallet"),
  });
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);
  try {
    return c.json(await setUsername(parsed.data));
  } catch (err) {
    if (err instanceof UsernameTakenError)
      return c.json({ error: err.message }, 409);
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
      logger.info(
        { port: info.port, host: config.host },
        "soccit api listening",
      );
    },
  );
}

export { app };
