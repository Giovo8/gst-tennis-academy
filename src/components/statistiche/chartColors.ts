// Palette dei grafici di Statistiche. Riusa i colori "campo"/"lezione privata" gia'
// definiti per Contabilita (stesso significato = stesso colore in tutta la dashboard) e li
// estende con i colori usati per i badge ruolo in Admin > Utenti (src/app/dashboard/admin/users/page.tsx),
// cosi' che un ruolo abbia sempre lo stesso colore ovunque compaia.
import { CHART_COLORS as CONTABILITA_COLORS, COURT_PALETTE } from "@/components/contabilita/chartColors";

export { COURT_PALETTE };

export const CHART_COLORS = {
  campo: CONTABILITA_COLORS.campo,
  lezione: CONTABILITA_COLORS.lezionePrivata,
  arena: "#0690c6", // frozen-lake-600
  nuoviUtenti: "#08b3f7", // frozen-lake-500
  neutral: CONTABILITA_COLORS.neutral,
} as const;

// Stessi colori dei badge ruolo in Admin > Utenti.
export const ROLE_COLORS: Record<string, string> = {
  admin: "#023047",
  gestore: "#023047",
  maestro: "#05384c",
  atleta: "#034863",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  gestore: "Gestore",
  maestro: "Maestro",
  atleta: "Atleta",
};

// Palette generica per serie con molte categorie (es. iscritti per corso).
export const CATEGORY_PALETTE = [
  "#08b3f7",
  "#0690c6",
  "#056c94",
  "#034863",
  "#05384c",
  "#022431",
];
