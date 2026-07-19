import { z } from "zod";

export const leaderboardPayload = z.object({
  fixtureId: z.number().int(),
  updatedAt: z.number().int(),
  final: z.boolean(),
  winners: z.tuple([z.string().nullable(), z.string().nullable(), z.string().nullable()]),
});

export type LeaderboardPayload = z.infer<typeof leaderboardPayload>;

export const leaderboardKey = (fixtureId: number) => `leaderboard:${fixtureId}`;
