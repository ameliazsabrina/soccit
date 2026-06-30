import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { publicProcedure, router } from "./trpc.js";
import { MatchNotFoundError } from "../modules/match/match.errors.js";
import {
  InvalidSignatureError,
  UsernameTakenError,
} from "../modules/user/user.errors.js";

// Exercise the errorMapping middleware in isolation: a procedure per error
// shape, so we assert the resulting tRPC code without touching Redis/RPC.
const testRouter = router({
  needsInput: publicProcedure
    .input(z.object({ n: z.number().int().positive() }))
    .query(() => "ok"),
  notFound: publicProcedure.query(() => {
    throw new MatchNotFoundError(1);
  }),
  unauthorized: publicProcedure.query(() => {
    throw new InvalidSignatureError();
  }),
  conflict: publicProcedure.query(() => {
    throw new UsernameTakenError("alice");
  }),
  internal: publicProcedure.query(() => {
    throw new Error("boom");
  }),
});

const caller = testRouter.createCaller({});

async function codeOf(run: Promise<unknown>): Promise<string> {
  try {
    await run;
    return "NO_ERROR";
  } catch (err) {
    return err instanceof TRPCError ? err.code : "NON_TRPC_ERROR";
  }
}

describe("trpc errorMapping", () => {
  it("maps Zod input failures to BAD_REQUEST (regression: was 500)", async () => {
    expect(await codeOf(caller.needsInput({ n: -1 }))).toBe("BAD_REQUEST");
  });

  it("maps domain not-found errors to NOT_FOUND", async () => {
    expect(await codeOf(caller.notFound())).toBe("NOT_FOUND");
  });

  it("maps signature failures to UNAUTHORIZED", async () => {
    expect(await codeOf(caller.unauthorized())).toBe("UNAUTHORIZED");
  });

  it("maps duplicate errors to CONFLICT", async () => {
    expect(await codeOf(caller.conflict())).toBe("CONFLICT");
  });

  it("falls back to INTERNAL_SERVER_ERROR for unknown errors", async () => {
    expect(await codeOf(caller.internal())).toBe("INTERNAL_SERVER_ERROR");
  });
});
