export type StructureTeam = { name: string; code: string };
export type StructureMatch = {
  id: string;
  fixtureId: number | null;
  home: StructureTeam;
  away: StructureTeam;
};
export type StructureRound = {
  name: string;
  shortName: string;
  matches: StructureMatch[];
};

const m = (
  id: string,
  home: StructureTeam,
  away: StructureTeam,
  fixtureId: number | null = null,
): StructureMatch => ({ id, fixtureId, home, away });

const WORLDCUP: StructureRound[] = [
  {
    name: "Round of 32",
    shortName: "R32",
    matches: [
      m(
        "r32-1",
        { name: "Netherlands", code: "nl" },
        { name: "United States", code: "us" },
      ),
      m(
        "r32-2",
        { name: "Argentina", code: "ar" },
        { name: "Australia", code: "au" },
      ),
      m(
        "r32-3",
        { name: "Japan", code: "jp" },
        { name: "Croatia", code: "hr" },
      ),
      m(
        "r32-4",
        { name: "Brazil", code: "br" },
        { name: "South Korea", code: "kr" },
      ),
      m(
        "r32-5",
        { name: "England", code: "gb-eng" },
        { name: "Senegal", code: "sn" },
      ),
      m(
        "r32-6",
        { name: "France", code: "fr" },
        { name: "Poland", code: "pl" },
      ),
      m(
        "r32-7",
        { name: "Morocco", code: "ma" },
        { name: "Spain", code: "es" },
      ),
      m(
        "r32-8",
        { name: "Portugal", code: "pt" },
        { name: "Switzerland", code: "ch" },
      ),
    ],
  },
  {
    name: "Round of 16",
    shortName: "R16",
    matches: [
      m(
        "r16-1",
        { name: "Netherlands", code: "nl" },
        { name: "Argentina", code: "ar" },
      ),
      m(
        "r16-2",
        { name: "Croatia", code: "hr" },
        { name: "Brazil", code: "br" },
      ),
      m(
        "r16-3",
        { name: "England", code: "gb-eng" },
        { name: "France", code: "fr" },
      ),
      m(
        "r16-4",
        { name: "Morocco", code: "ma" },
        { name: "Portugal", code: "pt" },
      ),
    ],
  },
  {
    name: "Quarter-Finals",
    shortName: "QF",
    matches: [
      m(
        "qf-1",
        { name: "Argentina", code: "ar" },
        { name: "Croatia", code: "hr" },
      ),
      m(
        "qf-2",
        { name: "France", code: "fr" },
        { name: "Morocco", code: "ma" },
      ),
    ],
  },
  {
    name: "Semi-Finals",
    shortName: "SF",
    matches: [
      m(
        "sf-1",
        { name: "Argentina", code: "ar" },
        { name: "France", code: "fr" },
      ),
    ],
  },
  {
    name: "Final",
    shortName: "Final",
    matches: [
      m(
        "final",
        { name: "Argentina", code: "ar" },
        { name: "France", code: "fr" },
      ),
    ],
  },
];

const STRUCTURES: Record<string, StructureRound[]> = {
  worldcup: WORLDCUP,
};

export function getStructure(slug: string): StructureRound[] | undefined {
  return STRUCTURES[slug];
}
