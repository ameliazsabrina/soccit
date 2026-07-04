import { leaderboardOutput } from "@soccit/scoring/leaderboard/schema";
import {
  matchInput,
  matchListOutput,
  matchStateOutput,
} from "../modules/match/match.schema.js";
import { getMatchState, listMatches } from "../modules/match/match.service.js";
import { resolveFixtureId } from "../modules/match/pda.js";
import { enrichedLeaderboardOutput } from "../modules/leaderboard/leaderboard.schema.js";
import {
  enrichLeaderboard,
  getLeaderboard,
  leaderboardKey,
  parseLeaderboard,
} from "../modules/leaderboard/leaderboard.service.js";
import { eventEntrySchema, eventsInput } from "../modules/events/events.schema.js";
import { backfill, enrichEntry, tail } from "../modules/events/events.service.js";
import { lineupInput, lineupOutput } from "../modules/lineup/lineup.schema.js";
import { getLineup, loadPlayerIndex } from "../modules/lineup/lineup.service.js";
import {
  avatarsOutput,
  registerInput,
  setAvatarInput,
  userProfile,
  walletInput,
} from "../modules/user/user.schema.js";
import {
  getUser,
  listAvatars,
  loadUserProfiles,
  registerUser,
  setAvatar,
} from "../modules/user/user.service.js";
import { userMatchesOutput } from "../modules/participation/participation.schema.js";
import { getUserMatches } from "../modules/participation/participation.service.js";
import {
  scheduleInput,
  scheduleOutput,
} from "../modules/schedule/schedule.schema.js";
import { listSchedule } from "../modules/schedule/schedule.service.js";
import {
  preparePredictionInput,
  preparePredictionOutput,
} from "../modules/prediction/prediction.schema.js";
import { preparePrediction } from "../modules/prediction/prediction.service.js";
import { getRedis, newRedisConnection } from "../redis.js";
import { subscribeChannel } from "../pubsub.js";
import { publicProcedure, router } from "./trpc.js";

function resolveSignal(signal: AbortSignal | undefined): AbortSignal {
  return signal ?? new AbortController().signal;
}

const matchRouter = router({
  list: publicProcedure.output(matchListOutput).query(() => listMatches()),

  get: publicProcedure
    .input(matchInput)
    .output(matchStateOutput)
    .query(async ({ input }) => getMatchState(await resolveFixtureId(input.pda))),
});

const leaderboardRouter = router({
  get: publicProcedure
    .input(matchInput)
    .output(enrichedLeaderboardOutput)
    .query(async ({ input }) => getLeaderboard(await resolveFixtureId(input.pda))),

  stream: publicProcedure.input(matchInput).subscription(async function* ({ input, signal }) {
    const sig = resolveSignal(signal);
    const fixtureId = await resolveFixtureId(input.pda);
    let index = await loadPlayerIndex(fixtureId);
    const emit = async (board: ReturnType<typeof parseLeaderboard>) => {
      if (index.size === 0) index = await loadPlayerIndex(fixtureId);
      const users = await loadUserProfiles(board.ranking.map((e) => e.owner));
      return enrichLeaderboard(board, index, users);
    };
    const initial = await getRedis().get(leaderboardKey(fixtureId));
    if (initial) yield await emit(leaderboardOutput.parse(JSON.parse(initial)));
    for await (const message of subscribeChannel(leaderboardKey(fixtureId), sig)) {
      yield await emit(parseLeaderboard(message, fixtureId));
    }
  }),
});

const eventsRouter = router({
  stream: publicProcedure.input(eventsInput).subscription(async function* ({ input, signal }) {
    const sig = resolveSignal(signal);
    const fixtureId = await resolveFixtureId(input.pda);
    let index = await loadPlayerIndex(fixtureId);
    const reader = newRedisConnection();
    let cursor = input.fromId ?? "0-0";
    try {
      for (const entry of await backfill(reader, fixtureId, cursor)) {
        cursor = entry.id;
        yield eventEntrySchema.parse(enrichEntry(entry, index));
      }
    } finally {
      reader.disconnect();
    }
    for await (const entry of tail(fixtureId, cursor, sig)) {
      if (entry.type === "substitution" && index.size === 0) index = await loadPlayerIndex(fixtureId);
      yield eventEntrySchema.parse(enrichEntry(entry, index));
    }
  }),
});

const lineupRouter = router({
  get: publicProcedure
    .input(lineupInput)
    .output(lineupOutput)
    .query(async ({ input }) => getLineup(await resolveFixtureId(input.pda))),
});

const userRouter = router({
  register: publicProcedure
    .input(registerInput)
    .output(userProfile)
    .mutation(({ input }) => registerUser(input)),

  get: publicProcedure
    .input(walletInput)
    .output(userProfile)
    .query(({ input }) => getUser(input.wallet)),

  setAvatar: publicProcedure
    .input(setAvatarInput)
    .output(userProfile)
    .mutation(({ input }) => setAvatar(input)),

  matches: publicProcedure
    .input(walletInput)
    .output(userMatchesOutput)
    .query(({ input }) => getUserMatches(input.wallet)),

  avatars: publicProcedure.output(avatarsOutput).query(() => listAvatars()),
});

const scheduleRouter = router({
  list: publicProcedure
    .input(scheduleInput.optional())
    .output(scheduleOutput)
    .query(({ input }) => listSchedule(input ?? {})),
});

const predictionRouter = router({
  prepare: publicProcedure
    .input(preparePredictionInput)
    .output(preparePredictionOutput)
    .mutation(({ input }) => preparePrediction(input)),
});

export const appRouter = router({
  match: matchRouter,
  schedule: scheduleRouter,
  prediction: predictionRouter,
  leaderboard: leaderboardRouter,
  events: eventsRouter,
  lineup: lineupRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
