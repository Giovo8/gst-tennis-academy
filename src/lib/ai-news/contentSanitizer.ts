const MEDIA_KEYWORD_REGEX = /\b(video|clip|highlights?|youtube|filmato|guarda|diretta|live\b|streaming)\b/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "-",
  mdash: "-",
  hellip: "...",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10) || 32))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16) || 32))
    .replace(/&([a-zA-Z]+);/g, (full, name) => NAMED_ENTITIES[name.toLowerCase()] ?? full);
}

function normalizeBrokenUtf8(text: string): string {
  return text
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€�/g, '"')
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/â€¦/g, "...")
    .replace(/Â/g, "")
    .replace(/Ã /g, "a")
    .replace(/Ã¨/g, "e")
    .replace(/Ã©/g, "e")
    .replace(/Ã¬/g, "i")
    .replace(/Ã²/g, "o")
    .replace(/Ã¹/g, "u");
}

function removeMediaSentences(text: string): string {
  const chunks = text.split(/(?<=[.!?])\s+/);
  const filtered = chunks.filter((chunk) => !MEDIA_KEYWORD_REGEX.test(chunk));
  return filtered.join(" ").replace(/\s+/g, " ").trim();
}

function cleanBaseText(input: string): string {
  return removeMediaSentences(normalizeBrokenUtf8(decodeHtmlEntities(input || "")))
    .replace(/\[\s*(?:\.\.\.|…)+\s*\]/g, "")
    .replace(/\b(?:continua a leggere|leggi (?:tutto|anche)|read more)\b\.?/gi, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function sanitizeAINewsTitle(input: string): string {
  const cleaned = cleanBaseText(input)
    .replace(/^\s*(?:video|highlights?|live|diretta)\s*[:\-]\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || "News Tennis";
}

export function sanitizeAINewsBody(input: string): string {
  return cleanBaseText(input)
    .replace(/\n\nPer chi segue il tennis[\s\S]*?prossime settimane\.?/gi, "")
    .replace(/\n\nDal punto di vista tattico[\s\S]*?al titolo\.?/gi, "")
    .replace(/\n\nImpatto sportivo:[\s\S]*?coinvolti\.?/gi, "")
    .replace(/\n\nNel dettaglio emergono numeri utili[\s\S]*?\.?/gi, "")
    .replace(/\n\nL'aggiornamento e datato[\s\S]*?\.?/gi, "")
    .replace(/\n\nIl passaggio piu rilevante resta[\s\S]*?\.?/gi, "")
    .replace(/\n\nIl quadro si aggiorna al[\s\S]*?tabellone\.?/gi, "")
    .replace(/\n\n[^\n]*(?:video|clip|highlights?|youtube|filmato|guarda|diretta|live|streaming)[^\n]*/gi, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}
