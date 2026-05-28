export const MATCH_FORMATS = [
  { value: "singolo", label: "Singolo" },
  { value: "doppio", label: "Doppio" },
] as const;

export type MatchFormat = (typeof MATCH_FORMATS)[number]["value"];
