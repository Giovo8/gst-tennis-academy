export const ARENA_MATCH_FORMATS = [
  { value: "best_of_3", label: "Best of 3" },
  { value: "best_of_5", label: "Best of 5" },
  { value: "best_of_1", label: "Set Singolo" },
] as const;

export type ArenaMatchFormat = (typeof ARENA_MATCH_FORMATS)[number]["value"];

export const CHALLENGE_TYPES = [
  { value: "ranked", label: "Classificata" },
  { value: "amichevole", label: "Amichevole" },
] as const;
