import { leaderboardOutput } from "@soccit/scoring/leaderboard/schema";
import { matchInput, matchStateOutput } from "../modules/match/match.schema.js";
import { getMatchState } from "../modules/match/match.service.js";
import {
  getLeaderboard,
  leaderboardKey,
  parseLeaderboard,
} from "../modules/leaderboard/leaderboard.service.js";
import { eventEntrySchema, eventsInput } from "../modules/events/events.schema.js";
import { backfill, tail } from "../modules/events/events.service.js";
import { lineupInput, lineupOutput } from "../modules/lineup/lineup.schema.js";
import { getLineup } from "../modules/lineup/lineup.service.js";
import { getRedis, newRedisConnection } from "../redis.js";
import { subscribeChannel } from "../pubsub.js";
import { publicProcedure, router } from "./trpc.js";

function resolveSignal(signal: AbortSignal | undefined): AbortSignal {
  return signal ?? new AbortController().signal;
}

const matchRouter = router({
  get: publicProcedure
    .input(matchInput)
    .output(matchStateOutput)
    .query(({ input }) => getMatchState(input.fixtureId)),
});

const leaderboardRouter = router({
  get: publicProcedure
    .input(matchInput)
    .output(leaderboardOutput)
    .query(({ input }) => getLeaderboard(input.fixtureId)),

  stream: publicProcedure.input(matchInput).subscription(async function* ({ input, signal }) {
    const sig = resolveSignal(signal);
    const initial = await getRedis().get(leaderboardKey(input.fixtureId));
    if (initial) yield leaderboardOutput.parse(JSON.parse(initial));
    for await (const message of subscribeChannel(leaderboardKey(input.fixtureId), sig)) {
      yield parseLeaderboard(message, input.fixtureId);
    }
  }),
});

const eventsRouter = router({
  stream: publicProcedure.input(eventsInput).subscription(async function* ({ input, signal }) {
    const sig = resolveSignal(signal);
    const reader = newRedisConnection();
    let cursor = input.fromId ?? "0-0";
    try {
      for (const entry of await backfill(reader, input.fixtureId, cursor)) {
        cursor = entry.id;
        yield eventEntrySchema.parse(entry);
      }
    } finally {
      reader.disconnect();
    }
    for await (const entry of tail(input.fixtureId, cursor, sig)) {
      yield eventEntrySchema.parse(entry);
    }
  }),
});

const lineupRouter = router({
  get: publicProcedure
    .input(lineupInput)
    .output(lineupOutput)
    .query(({ input }) => getLineup(input.fixtureId)),
});

export const appRouter = router({
  match: matchRouter,
  leaderboard: leaderboardRouter,
  events: eventsRouter,
  lineup: lineupRouter,
});

export type AppRouter = typeof appRouter;
