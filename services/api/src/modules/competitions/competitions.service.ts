import { type Competition, competitionsOutput } from "./competitions.schema.js";

const COMPETITIONS: Competition[] = [
  {
    slug: "worldcup",
    label: "Predict World Cup 2026 Bracket",
    bannerBg: "assets/events/fwc-banner-bg.webp",
    logo: "assets/events/fwc-logo-white.svg",
    comingSoon: false,
    competitionId: null,
  },
  {
    slug: "ucl",
    label: "UEFA Champions League",
    bannerBg: "assets/events/ucl-banner-bg.webp",
    logo: "assets/events/ucl-logo-white.svg",
    comingSoon: true,
    competitionId: null,
  },
];

export function listCompetitions(): Competition[] {
  return competitionsOutput.parse(COMPETITIONS);
}

export function getCompetition(slug: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.slug === slug);
}
