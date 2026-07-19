import { z } from "zod";

export const bracketInput = z.object({
  /** Competition slug, e.g. `worldcup` (matches `/api/competitions` slugs). */
  slug: z.string().min(1),
});

/** A knockout side. `advancing`/`eliminated` are derived from live+on-chain state. */
export const bracketTeamSchema = z.object({
  name: z.string(),
  code: z.string(),
  advancing: z.boolean(),
  eliminated: z.boolean(),
});

export const bracketMatchSchema = z.object({
  id: z.string(),
  /** TxLINE fixture id once pinned to this slot; null until then. */
  fixtureId: z.number().int().nullable(),
  home: bracketTeamSchema,
  away: bracketTeamSchema,
  homeScore: z.number().int().nullable(),
  awayScore: z.number().int().nullable(),
  status: z.enum(["scheduled", "live", "final"]),
  winner: z.enum(["home", "away"]).nullable(),
});

export const bracketRoundSchema = z.object({
  name: z.string(),
  shortName: z.string(),
  matches: z.array(bracketMatchSchema),
});

export const bracketOutput = z.object({
  updatedAt: z.number().int(),
  rounds: z.array(bracketRoundSchema),
});

export type BracketTeam = z.infer<typeof bracketTeamSchema>;
export type BracketMatch = z.infer<typeof bracketMatchSchema>;
export type BracketRound = z.infer<typeof bracketRoundSchema>;
export type BracketOutput = z.infer<typeof bracketOutput>;
