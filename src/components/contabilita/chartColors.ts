// Palette condivisa dai grafici di Contabilità, allineata ai colori usati nella timeline
// prenotazioni admin (src/components/admin/BookingsTimeline.tsx: getBookingStyle), cosi'
// che lo stesso tipo di prenotazione/corso sia sempre riconoscibile con lo stesso colore
// in tutta la dashboard. Valori esadecimali letterali (non var(--...)) perche' Recharts
// scrive fill/stop-color direttamente come attributi SVG: gia' lo stesso approccio del
// precedente RevenueChart.tsx.
export const CHART_COLORS = {
  campo: "#034863", // var(--secondary) / frozen-800 - blocchi "campo" in timeline
  lezionePrivata: "#023047", // blocchi "lezione privata/gruppo" in timeline
  corso: "#022431", // var(--color-frozen-lake-900) - blocchi "corso" in timeline
  quotaCorsi: "#034863",
  incassatoCorsi: "#0690c6", // var(--color-frozen-lake-600)
  neutral: "#94a3b8", // grigio delle prenotazioni "altrui"/non classificate in timeline
} as const;

// Scala frozen-lake (500->900), per serie con piu' categorie (es. ricavi per campo).
export const COURT_PALETTE = [
  "#08b3f7", // frozen-500
  "#0690c6", // frozen-600
  "#056c94", // frozen-700
  "#034863", // frozen-800 / secondary
  "#022431", // frozen-900
];

const TIPO_LABELS: Record<string, string> = {
  campo: "Campo",
  lezione_privata: "Lezione privata",
  lezione: "Lezione",
  lezione_gruppo: "Lezione di gruppo",
};

export function tipoPrenotazioneLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo;
}

export function tipoPrenotazioneColor(tipo: string): string {
  if (tipo === "campo") return CHART_COLORS.campo;
  if (tipo === "lezione_privata" || tipo === "lezione_gruppo" || tipo === "lezione") {
    return CHART_COLORS.lezionePrivata;
  }
  return CHART_COLORS.neutral;
}
