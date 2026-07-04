import { z } from "zod";

export const scheduleInput = z.object({
  startEpochDay: z.number().int().nonnegative().optional(),
  competitionId: z.number().int().optional(),
});

export const rawFixture = z
  .object({
    FixtureId: z.number(),
    StartTime: z.number().optional(),
    Competition: z.string().optional(),
    CompetitionId: z.number().optional(),
    Participant1: z.string().optional(),
    Participant2: z.string().optional(),
    Participant1Id: z.number().optional(),
    Participant2Id: z.number().optional(),
    Participant1IsHome: z.boolean().optional(),
  })
  .passthrough();

const teamSchema = z.object({
  id: z.number().int().nullable(),
  name: z.string().nullable(),
});

export const scheduleFixtureSchema = z.object({
  fixtureId: z.number().int(),
  startTime: z.number().int().nullable(),
  competition: z.string().nullable(),
  competitionId: z.number().int().nullable(),
  team1: teamSchema,
  team2: teamSchema,
  team1IsHome: z.boolean().nullable(),
});

export const scheduleOutput = z.array(scheduleFixtureSchema);

export type ScheduleInput = z.infer<typeof scheduleInput>;
export type RawFixture = z.infer<typeof rawFixture>;
export type ScheduleFixture = z.infer<typeof scheduleFixtureSchema>;
