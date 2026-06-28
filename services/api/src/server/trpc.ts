import { TRPCError, initTRPC } from "@trpc/server";
import { MatchNotFoundError } from "../modules/match/match.errors.js";
import { LeaderboardNotReadyError } from "../modules/leaderboard/leaderboard.errors.js";
import { LineupNotReadyError } from "../modules/lineup/lineup.errors.js";

export interface Context {
  signal?: AbortSignal;
}

const t = initTRPC.context<Context>().create();

function toTRPCError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  if (
    err instanceof MatchNotFoundError ||
    err instanceof LeaderboardNotReadyError ||
    err instanceof LineupNotReadyError
  ) {
    return new TRPCError({ code: "NOT_FOUND", message: err.message, cause: err });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: err instanceof Error ? err.message : "Unexpected error",
    cause: err,
  });
}

const errorMapping = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok) throw toTRPCError(result.error.cause ?? result.error);
  return result;
});

export const router = t.router;
export const publicProcedure = t.procedure.use(errorMapping);
