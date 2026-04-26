/**
 * Formattatori di data italiani con capitalizzazione coerente
 * (es. "Lun 7 Apr", "Lunedì 7 Aprile 2026").
 */

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * "Lun 7 Apr" — usato nelle liste di annunci/notifiche/eventi.
 */
export function formatShortItalianDate(dateStr: string): string {
  const date = new Date(dateStr);
  const weekday = capitalize(date.toLocaleDateString("it-IT", { weekday: "short" }));
  const day = date.getDate();
  const month = capitalize(date.toLocaleDateString("it-IT", { month: "short" }));
  return `${weekday} ${day} ${month}`;
}

/**
 * "08:30" — orario locale italiano.
 */
export function formatItalianTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * "Lunedì 7 Aprile 2026" — usato nei modali con la data per esteso.
 */
export function formatLongItalianDate(dateString: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .formatToParts(new Date(dateString))
    .map((part) =>
      (part.type === "weekday" || part.type === "month") && part.value.length > 0
        ? capitalize(part.value)
        : part.value
    )
    .join("");
}
