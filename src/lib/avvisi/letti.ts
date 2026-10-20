// Avvisi già aperti dall'atleta, salvati nel browser (solo per il puntino "non letto").
const STORAGE_KEY = 'avvisi_letti';

export function getAvvisiLetti(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function segnaAvvisoLetto(id: string) {
  try {
    const letti = getAvvisiLetti();
    if (letti.has(id)) return;
    letti.add(id);
    // Tiene solo gli ultimi 100 per non far crescere la chiave all'infinito
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...letti].slice(-100)));
  } catch {
    // storage non disponibile: il puntino resta, nessun errore
  }
}
