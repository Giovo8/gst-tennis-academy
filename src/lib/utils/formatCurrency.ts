const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

/**
 * Formatta un importo in euro secondo la localizzazione italiana.
 * Valori non finiti (NaN, Infinity) vengono trattati come 0.
 */
export function formatCurrency(amount: number): string {
  return eur.format(Number.isFinite(amount) ? amount : 0);
}
