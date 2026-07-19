import { z } from "zod";

export const competitionSchema = z.object({
  /** URL-safe identifier used in `/matches/events/:slug` routes. */
  slug: z.string(),
  /** Human-readable banner label. */
  label: z.string(),
  bannerBg: z.string(),
  logo: z.string(),
  comingSoon: z.boolean(),
  competitionId: z.number().int().nullable(),
});

export const competitionsOutput = z.array(competitionSchema);

export type Competition = z.infer<typeof competitionSchema>;
