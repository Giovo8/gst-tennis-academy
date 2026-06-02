import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Parser from "npm:rss-parser@3.13.0";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

type Fonte = {
  id: string;
  nome: string;
  url: string;
  categoria: string | null;
};

type CronConfig = {
  id: string;
  prompt_custom: string | null;
};

type NewsAiPayload = {
  titolo: string;
  testo: string;
};

type RssItemWithDate = {
  link?: string;
  guid?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  isoDate?: string;
  published?: string;
  [key: string]: unknown;
};

type ImageDownloadResult = {
  buffer: ArrayBuffer;
  contentType: string;
  ext: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function safeJsonParse(text: string): { titolo: string; testo: string } | null {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.titolo === "string" && typeof parsed?.testo === "string") {
      return { titolo: parsed.titolo.trim(), testo: parsed.testo.trim() };
    }
  } catch {
    // Proviamo fallback sotto.
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    if (typeof parsed?.titolo === "string" && typeof parsed?.testo === "string") {
      return { titolo: parsed.titolo.trim(), testo: parsed.testo.trim() };
    }
  } catch {
    return null;
  }

  return null;
}

function isGeminiQuotaError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("quota exceeded") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("429")
  );
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

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

function getRomeDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseItemDate(item: RssItemWithDate): Date | null {
  const rawDate = item.isoDate || item.pubDate || item.published;
  if (!rawDate || typeof rawDate !== "string") return null;

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isRecentToday(item: RssItemWithDate, now: Date): boolean {
  const parsed = parseItemDate(item);
  if (!parsed) return false;
  if (parsed.getTime() > now.getTime()) return false;
  return getRomeDateKey(parsed) === getRomeDateKey(now);
}

function firstHttpUrl(...candidates: Array<unknown>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.trim();
    if (!value) continue;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
  }
  return null;
}

function findImageInHtml(html: string | undefined): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return firstHttpUrl(match?.[1]);
}

function extractRssImageUrl(item: Record<string, unknown>): string | null {
  const enclosure = item.enclosure as { url?: unknown } | undefined;
  const mediaContent = item["media:content"] as
    | { $?: { url?: unknown } }
    | Array<{ $?: { url?: unknown } }>
    | undefined;
  const mediaThumbnail = item["media:thumbnail"] as
    | { $?: { url?: unknown } }
    | Array<{ $?: { url?: unknown } }>
    | undefined;
  const itunesImage = item["itunes:image"] as { href?: unknown } | undefined;

  const mediaContentUrl = Array.isArray(mediaContent)
    ? mediaContent[0]?.$?.url
    : mediaContent?.$?.url;
  const mediaThumbnailUrl = Array.isArray(mediaThumbnail)
    ? mediaThumbnail[0]?.$?.url
    : mediaThumbnail?.$?.url;

  return (
    firstHttpUrl(
      enclosure?.url,
      mediaContentUrl,
      mediaThumbnailUrl,
      itunesImage?.href,
      item.image,
      item.thumbnail,
      item["image_url"]
    ) ||
    findImageInHtml(item.content as string | undefined) ||
    findImageInHtml(item["content:encoded"] as string | undefined)
  );
}

function toAbsoluteUrl(baseUrl: string, candidateUrl: string): string {
  try {
    return new URL(candidateUrl, baseUrl).toString();
  } catch {
    return candidateUrl;
  }
}

async function extractImageFromArticlePage(articleUrl: string): Promise<string | null> {
  try {
    const response = await fetch(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GST-AI-News/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();
    const metaMatch = html.match(
      /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/i
    );
    if (metaMatch?.[1]) {
      return toAbsoluteUrl(articleUrl, metaMatch[1]);
    }

    const linkMatch = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
    if (linkMatch?.[1]) {
      return toAbsoluteUrl(articleUrl, linkMatch[1]);
    }

    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) {
      return toAbsoluteUrl(articleUrl, imgMatch[1]);
    }

    return null;
  } catch {
    return null;
  }
}

function pickFallbackImage(seed: string): string {
  const images = ["/images/1.jpeg", "/images/2.jpeg", "/images/3.jpeg"];
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return images[hash % images.length];
}

function isPrivateHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    hostname.startsWith("172.17.") ||
    hostname.startsWith("172.18.") ||
    hostname.startsWith("172.19.") ||
    hostname.startsWith("172.2") ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  );
}

async function fetchValidatedImage(imageUrl: string): Promise<ImageDownloadResult> {
  const parsed = new URL(imageUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL immagine non consentito");
  }

  if (isPrivateHost(parsed.hostname.toLowerCase())) {
    throw new Error("URL immagine non consentito");
  }

  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; GST-AI-News/1.0)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Impossibile scaricare l'immagine (HTTP ${response.status})`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
  if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(contentType)) {
    throw new Error("Il link non punta a un'immagine valida");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error("Immagine troppo grande (max 5MB)");
  }

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return { buffer, contentType, ext: extMap[contentType] || "jpg" };
}

async function resolveNewsImageUrl(
  supabase: ReturnType<typeof createClient>,
  imageUrl: string | null,
  articleUrl: string | null,
  seed: string
): Promise<string> {
  const candidates: string[] = [];
  if (imageUrl) candidates.push(imageUrl);

  if (articleUrl) {
    const pageImage = await extractImageFromArticlePage(articleUrl);
    if (pageImage) candidates.push(pageImage);
  }

  for (const candidate of candidates) {
    try {
      const result = await fetchValidatedImage(candidate);
      const fileName = `news/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${result.ext}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, result.buffer, {
        contentType: result.contentType,
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        continue;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      if (data.publicUrl) {
        return data.publicUrl;
      }
    } catch {
      // proviamo il candidato successivo
    }
  }

  return pickFallbackImage(seed);
}

// Fallback locale quando Gemini non è disponibile (quota/rate limit).
function extractNumericHighlights(text: string): string[] {
  const matches = text.match(/\b\d+(?:[.,]\d+)?(?:-\d+)?%?\b/g) ?? [];
  const unique = [...new Set(matches.map((m) => m.trim()))];
  return unique.slice(0, 8);
}

function sanitizeJournalisticText(text: string): string {
  return cleanBaseText(text)
    .replace(/\n\nPer chi segue il tennis[\s\S]*?prossime settimane\.?/gi, "")
    .replace(/\n\nDal punto di vista tattico[\s\S]*?al titolo\.?/gi, "")
    .replace(/\n\nImpatto sportivo:[\s\S]*?coinvolti\.?/gi, "")
    .replace(/\n\nNel dettaglio emergono numeri utili[\s\S]*?\.?/gi, "")
    .replace(/\n\nL'aggiornamento e datato[\s\S]*?\.?/gi, "")
    .replace(/\n\nIl passaggio piu rilevante resta[\s\S]*?\.?/gi, "")
    .replace(/\n\nIl quadro si aggiorna al[\s\S]*?tabellone\.?/gi, "")
    .replace(/\n\n[^\n]*(?:video|clip|highlights?|youtube|filmato|guarda|diretta|live|streaming)[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function removeUnsupportedMediaMentions(text: string): string {
  const chunks = text.split(/(?<=[.!?])\s+/);
  const filtered = chunks.filter(
    (chunk) => !MEDIA_KEYWORD_REGEX.test(chunk)
  );

  return filtered.join(" ").replace(/\s+/g, " ").trim();
}

function cleanBaseText(input: string): string {
  return removeUnsupportedMediaMentions(normalizeBrokenUtf8(decodeHtmlEntities(input || "")))
    .replace(/\[\s*(?:\.\.\.|…)+\s*\]/g, "")
    .replace(/\b(?:continua a leggere|leggi (?:tutto|anche)|read more)\b\.?/gi, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeGeneratedTitle(title: string): string {
  const cleaned = cleanBaseText(title)
    .replace(/^\s*(?:video|highlights?|live|diretta)\s*[:\-]\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || "News Tennis";
}

function formatItalianDateLabel(sourceDate: string | null): string | null {
  if (!sourceDate) return null;
  const date = new Date(sourceDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

async function extractArticleContextFromPage(articleUrl: string): Promise<string> {
  try {
    const response = await fetch(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GST-AI-News/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return "";

    const html = await response.text();
    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripHtml(m[1]))
      .filter((p) => p.length > 80)
      .filter((p) => !/cookie|privacy|newsletter|abbonati|iscriviti/i.test(p))
      .slice(0, 4);

    return paragraphs.join(" ").slice(0, 1800);
  } catch {
    return "";
  }
}

async function buildFallbackNews(
  titoloRss: string,
  descrizioneRss: string,
  fonteNome: string,
  dataPubblicazione: string | null,
  articleUrl: string | null
): Promise<NewsAiPayload> {
  const cleanTitle = titoloRss.trim();
  const cleanDesc = stripHtml(descrizioneRss || "");
  const articleContext = articleUrl ? await extractArticleContextFromPage(articleUrl) : "";
  const mergedContext = removeUnsupportedMediaMentions(
    [cleanDesc, articleContext].filter(Boolean).join(" ").slice(0, 2200)
  );
  const dettagli = (mergedContext || "La fonte non fornisce un corpo esteso della notizia nel feed RSS.")
    .replace(/\s+/g, " ")
    .trim();
  const frasi = dettagli.split(/(?<=[.!?])\s+/).filter((f) => f.length > 35);
  const lead = frasi.slice(0, 2).join(" ") || dettagli;
  const sviluppo = frasi.slice(2, 7).join(" ");

  const titolo = sanitizeGeneratedTitle(cleanTitle);
  const testo = sanitizeJournalisticText([
    `${cleanTitle}. ${lead}`,
    sviluppo || `La cronaca proposta da ${fonteNome} fotografa un passaggio importante del torneo e chiarisce i temi tecnici che possono orientare i prossimi incontri.`,
  ].join("\n\n"));

  return { titolo, testo };
}

function normalizeNewsCategory(): string {
  return "notizie";
}

async function parseFeedWithFallback(parser: Parser, url: string) {
  try {
    return await parser.parseURL(url);
  } catch (firstError) {
    // Alcune fonti (es. ATP) possono bloccare richieste senza user-agent.
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GST-AI-News/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    });

    if (!response.ok) {
      const message = firstError instanceof Error ? firstError.message : `Status code ${response.status}`;
      throw new Error(message);
    }

    const xml = await response.text();
    return await parser.parseString(xml);
  }
}

function getFeedCandidates(fonte: Fonte): string[] {
  const base = [fonte.url];
  const tag = `${fonte.nome} ${fonte.url}`.toLowerCase();

  if (tag.includes("atp")) {
    base.push(
      "https://www.tennisitaliano.it/feed/",
      "https://oktennis.it/feed/",
      "https://www.livetennis.it/feed/",
      "https://www.tennismajors.com/feed/"
    );
  }

  if (tag.includes("gazzetta")) {
    base.push(
      "https://oktennis.it/feed/",
      "https://www.tennisitaliano.it/feed/",
      "https://www.livetennis.it/feed/",
      "https://www.tennismajors.com/feed/"
    );
  }

  return [...new Set(base)];
}

async function loadRecentItemsForSource(
  parser: Parser,
  fonte: Fonte,
  maxItems: number,
  now: Date
): Promise<{ items: RssItemWithDate[]; usedUrl: string | null; reason: string | null }> {
  const candidates = getFeedCandidates(fonte);
  let lastReason: string | null = null;

  for (const candidateUrl of candidates) {
    try {
      const feed = await parseFeedWithFallback(parser, candidateUrl);
      const recentItems = (feed.items ?? [])
        .filter((item) => isRecentToday(item as RssItemWithDate, now))
        .slice(0, maxItems) as RssItemWithDate[];

      if (recentItems.length > 0) {
        return { items: recentItems, usedUrl: candidateUrl, reason: null };
      }

      lastReason = `Nessun articolo recente da ${candidateUrl}`;
    } catch (error) {
      lastReason = error instanceof Error ? error.message : "Errore fonte sconosciuto";
    }
  }

  return { items: [], usedUrl: null, reason: lastReason };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti");
    }

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY mancante");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    const body = await req.json().catch(() => ({}));

    const categoria = typeof body?.categoria === "string" && body.categoria.trim()
      ? body.categoria.trim().toLowerCase()
      : null;
    const cronId = typeof body?.cron_id === "string" ? body.cron_id : null;

    const parser = new Parser();
    const gemini = new GoogleGenerativeAI(geminiApiKey);
    // Usa un modello disponibile nel 2026; 1.5-flash può non essere più esposto su v1beta.
    const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

    const { data: config, error: configError } = await supabase
      .from("ai_news_config")
      .select("pubblicazione_auto, numero_post")
      .order("aggiornato_a", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError) throw new Error(configError.message);

    const pubblicazioneAuto = Boolean(config?.pubblicazione_auto);
  const numeroPost = Math.max(1, Math.floor(Number(config?.numero_post ?? 5) || 5));

    let promptCustom: string | null = null;
    if (cronId) {
      const { data: cron, error: cronError } = await supabase
        .from("ai_news_cron")
        .select("id, prompt_custom")
        .eq("id", cronId)
        .maybeSingle<CronConfig>();

      if (cronError) throw new Error(cronError.message);
      promptCustom = cron?.prompt_custom ?? null;
    }

    let query = supabase
      .from("ai_news_fonti")
      .select("id, nome, url, categoria")
      .eq("attiva", true);

    if (categoria) {
      query = query.eq("categoria", categoria);
    }

    const { data: fonti, error: fontiError } = await query;

    if (fontiError) {
      throw new Error(fontiError.message);
    }

    const generateErrors: string[] = [];
    let generateCount = 0;
    let skippedCount = 0;

    for (const fonte of (fonti ?? []) as Fonte[]) {
      if (generateCount >= numeroPost) break;

      try {
        const now = new Date();
        const sourceLoad = await loadRecentItemsForSource(parser, fonte, 3, now);
        const articoli = sourceLoad.items;

        if (articoli.length === 0) {
          skippedCount += 1;
          generateErrors.push(`Fonte ${fonte.nome} senza articoli recenti: ${sourceLoad.reason ?? "nessun dato"}`);
          continue;
        }

        for (const articolo of articoli) {
          if (generateCount >= numeroPost) break;

          const fonteUrl = articolo.link || articolo.guid || null;
          if (!fonteUrl) {
            skippedCount += 1;
            continue;
          }

          const { data: duplicato } = await supabase
            .from("news")
            .select("id")
            .eq("fonte_url", fonteUrl)
            .limit(1)
            .maybeSingle();

          if (duplicato?.id) {
            skippedCount += 1;
            continue;
          }

          const titoloRss = articolo.title?.trim() || "Senza titolo";
          const descrizioneRss =
            articolo.contentSnippet?.trim() ||
            articolo.content?.replace(/<[^>]*>/g, " ").trim() ||
            "";
          const dataRss = parseItemDate(articolo as RssItemWithDate)?.toISOString() ?? null;
          const notiziaCompleta = stripHtml(
            [
              titoloRss,
              descrizioneRss,
              articolo.contentSnippet || "",
              articolo.content || "",
            ].join(" ")
          ).slice(0, 5000);

          const promptBase = [
            "Sei un redattore sportivo senior per una tennis academy italiana.",
            "Scrivi una news approfondita, concreta e informativa senza inventare dati.",
            "Obiettivo: massimizzare le informazioni utili presenti nella fonte.",
            "Vincoli:",
            "1) Titolo chiaro e giornalistico (max 16 parole).",
            "2) Testo lungo 4-6 paragrafi, tra 900 e 1600 caratteri.",
            "3) Includi sempre dettagli tecnici: risultati, punteggi, numeri, date, ranking, streak, statistiche quando disponibili.",
            "4) Se alcuni numeri non sono presenti nella fonte, non inventarli.",
            "5) Tono professionale, leggibile, adatto a pubblico sportivo.",
            "6) Non citare video, clip, highlights o contenuti multimediali non incorporati nell'articolo pubblicato.",
            "7) Stile cronaca: racconta fatti e contesto tecnico, senza inviti a guardare contenuti esterni.",
            "8) Non inserire mai marker di testo troncato come [...] o […].",
            "Rispondi SOLO con JSON valido: { titolo: '...', testo: '...' }",
            `Fonte: ${fonte.nome}`,
            `URL articolo: ${fonteUrl}`,
            `Data feed: ${dataRss ?? "non disponibile"}`,
            `Contenuto sorgente: ${notiziaCompleta}`,
          ].join("\n");

          const finalPrompt = promptCustom ? `${promptBase}\nPrompt extra: ${promptCustom}` : promptBase;

          let parsed: NewsAiPayload | null = null;

          try {
            const aiResponse = await model.generateContent(finalPrompt);
            const outputText = aiResponse.response.text();
            parsed = safeJsonParse(outputText);

            if (!parsed) {
              skippedCount += 1;
              generateErrors.push(`Parsing JSON fallito per fonte ${fonte.nome}: ${titoloRss}`);
              continue;
            }
          } catch (modelError) {
            const modelMessage = modelError instanceof Error ? modelError.message : "Errore Gemini";

            if (isGeminiQuotaError(modelMessage)) {
              parsed = await buildFallbackNews(titoloRss, descrizioneRss, fonte.nome, dataRss, fonteUrl);
              generateErrors.push(`Gemini in quota limit su ${fonte.nome}: usato fallback locale.`);
            } else {
              skippedCount += 1;
              generateErrors.push(`Errore AI su ${fonte.nome}: ${modelMessage}`);
              continue;
            }
          }

          const stato = pubblicazioneAuto ? "pubblicata" : "bozza";
          const isPublished = stato === "pubblicata";
          const titoloPulito = sanitizeGeneratedTitle(parsed.titolo);
          const testoPulito = sanitizeJournalisticText(removeUnsupportedMediaMentions(parsed.testo));

          if (!testoPulito) {
            skippedCount += 1;
            generateErrors.push(`Contenuto vuoto dopo sanitizzazione (${fonte.nome}): ${titoloRss}`);
            continue;
          }

          const imageUrl = await resolveNewsImageUrl(
            supabase,
            extractRssImageUrl(articolo as Record<string, unknown>),
            fonteUrl,
            `${fonte.nome}-${titoloRss}`
          );

          const { error: insertError } = await supabase.from("news").insert({
            title: titoloPulito,
            content: testoPulito,
            excerpt: testoPulito.slice(0, 220),
            category: normalizeNewsCategory(),
            stato,
            ai_generated: true,
            image_url: imageUrl,
            fonte_url: fonteUrl,
            fonte_nome: fonte.nome,
            is_published: isPublished,
            published_at: isPublished ? new Date().toISOString() : null,
          });

          if (insertError) {
            skippedCount += 1;
            generateErrors.push(`Insert fallito (${fonte.nome}): ${insertError.message}`);
            continue;
          }

          generateCount += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Errore sconosciuto";
        generateErrors.push(`Errore fonte ${fonte.nome}: ${message}`);
      }
    }

    if (cronId) {
      await supabase
        .from("ai_news_cron")
        .update({ ultimo_eseguito: new Date().toISOString() })
        .eq("id", cronId);
    }

    await supabase.from("ai_news_generation_logs").insert({
      tipo: cronId ? "cron" : "manuale",
      cron_id: cronId,
      generate: generateCount,
      skippate: skippedCount,
      errori: generateErrors,
    });

    return new Response(
      JSON.stringify({
        generate: generateCount,
        skippate: skippedCount,
        errori: generateErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Errore interno funzione",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
