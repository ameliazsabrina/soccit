import { z } from "zod";

export const eventEntrySchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
});

export const eventsInput = z.object({
  fixtureId: z.number().int().positive(),
  fromId: z.string().optional(),
});

export type EventEntry = z.infer<typeof eventEntrySchema>;
export type EventsInput = z.infer<typeof eventsInput>;
