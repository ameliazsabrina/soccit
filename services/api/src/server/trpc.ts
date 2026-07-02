import { TRPCError, initTRPC } from "@trpc/server";
import { MatchNotFoundError } from "../modules/match/match.errors.js";
import { MatchNotOpenError } from "../modules/prediction/prediction.errors.js";
import { LeaderboardNotReadyError } from "../modules/leaderboard/leaderboard.errors.js";
import { LineupNotReadyError } from "../modules/lineup/lineup.errors.js";
import {
  InvalidSignatureError,
  UserNotFoundError,
  UsernameTakenError,
  WalletAlreadyRegisteredError,
} from "../modules/user/user.errors.js";

export interface Context {
  signal?: AbortSignal;
}

const t = initTRPC.context<Context>().create();

/** Map a known domain error to its tRPC code, or null if it is not one we own. */
function mapDomainError(err: unknown): TRPCError | null {
  if (
    err instanceof MatchNotFoundError ||
    err instanceof LeaderboardNotReadyError ||
    err instanceof LineupNotReadyError ||
    err instanceof UserNotFoundError
  ) {
    return new TRPCError({
      code: "NOT_FOUND",
      message: err.message,
      cause: err,
    });
  }
  if (err instanceof InvalidSignatureError) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: err.message,
      cause: err,
    });
  }
  if (
    err instanceof UsernameTakenError ||
    err instanceof WalletAlreadyRegisteredError ||
    err instanceof MatchNotOpenError
  ) {
    return new TRPCError({
      code: "CONFLICT",
      message: err.message,
      cause: err,
    });
  }
  return null;
}

function toTRPCError(err: unknown): TRPCError {
  if (err instanceof TRPCError) {
    return mapDomainError(err.cause) ?? err;
  }
  return (
    mapDomainError(err) ??
    new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err instanceof Error ? err.message : "Unexpected error",
      cause: err,
    })
  );
}

const errorMapping = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok) throw toTRPCError(result.error);
  return result;
});

export const router = t.router;
export const publicProcedure = t.procedure.use(errorMapping);
