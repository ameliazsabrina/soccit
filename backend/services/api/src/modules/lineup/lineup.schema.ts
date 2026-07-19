import { z } from "zod";
import { pdaString } from "../match/match.schema.js";

export const lineupInput = z.object({
  pda: pdaString,
});

const sideSchema = z.union([z.literal(1), z.literal(2)]);

export const storedPlayerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  number: z.string().nullable(),
  starter: z.boolean(),
  positionId: z.number().int().nullable(),
  onPitch: z.boolean().nullable().optional(),
  warmingUp: z.boolean().nullable().optional(),
});

export const storedTeamSchema = z.object({
  side: sideSchema,
  teamId: z.number().int(),
  teamName: z.string().nullable(),
  players: z.array(storedPlayerSchema),
});

export const storedLineupSchema = z.object({
  fixtureId: z.number().int(),
  updatedAt: z.number().int(),
  teams: z.array(storedTeamSchema),
  names: z.record(z.string(), z.string()),
});

export const lineupPlayerSchema = storedPlayerSchema.extend({
  position: z.string().nullable(),
});

export const lineupTeamSchema = z.object({
  side: sideSchema,
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

export const resolvedPlayerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  number: z.string().nullable(),
  positionId: z.number().int().nullable(),
  position: z.string().nullable(),
  side: sideSchema,
});

export type LineupInput = z.infer<typeof lineupInput>;
export type StoredLineup = z.infer<typeof storedLineupSchema>;
export type LineupPlayer = z.infer<typeof lineupPlayerSchema>;
export type LineupTeam = z.infer<typeof lineupTeamSchema>;
export type LineupOutput = z.infer<typeof lineupOutput>;
export type ResolvedPlayer = z.infer<typeof resolvedPlayerSchema>;
