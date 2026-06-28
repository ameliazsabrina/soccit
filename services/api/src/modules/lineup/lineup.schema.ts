import { z } from "zod";

export const lineupInput = z.object({
  fixtureId: z.number().int().positive(),
});

export const lineupPlayerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  number: z.string().nullable(),
  starter: z.boolean(),
  positionId: z.number().int().nullable(),
});

export const lineupTeamSchema = z.object({
  side: z.union([z.literal(1), z.literal(2)]),
  teamId: z.number().int(),
  teamName: z.string().nullable(),
  players: z.array(lineupPlayerSchema),
});

export const lineupOutput = z.object({
  fixtureId: z.number().int(),
  updatedAt: z.number().int(),
  teams: z.array(lineupTeamSchema),
  names: z.record(z.string(), z.string()),
});

export type LineupInput = z.infer<typeof lineupInput>;
export type LineupPlayer = z.infer<typeof lineupPlayerSchema>;
export type LineupTeam = z.infer<typeof lineupTeamSchema>;
export type LineupOutput = z.infer<typeof lineupOutput>;
