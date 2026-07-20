// Palette dei grafici dell'Area Maestro. Riusa gli esadecimali gia' definiti per la
// timeline prenotazioni / Contabilita cosi' che lo stesso concetto (lezione, corso, campo)
// abbia lo stesso colore in tutta la dashboard. Valori letterali perche' Recharts scrive
// fill/stroke direttamente come attributi SVG.
export const MAESTRO_COLORS = {
  primary: "#023047", // navy accento maestro (bordi hero, barre principali)
  secondary: "#034863", // var(--secondary)
  accent: "#0690c6", // frozen-lake-600
  light: "#08b3f7", // frozen-lake-500
  dark: "#022431", // frozen-lake-900 (corsi)
  grid: "#0000000d",
  axis: "#034863",
  axisLine: "#0000001a",
} as const;

// Composizione lezioni: individuali / gruppo / corso.
export const COMPOSITION_COLORS = {
  privata: "#023047",
  gruppo: "#08b3f7",
  corso: "#022431",
} as const;
