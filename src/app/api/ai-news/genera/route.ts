import { NextResponse } from "next/server";
import { requireAdminOrGestore } from "@/lib/ai-news/auth";
import { callGeneraNewsEdge, normalizeCategoria } from "@/lib/ai-news/utils";
import { sanitizeAINewsBody, sanitizeAINewsTitle } from "@/lib/ai-news/contentSanitizer";
import { supabaseServer } from "@/lib/supabase/serverClient";
import Parser from "rss-parser";

export const dynamic = "force-dynamic";

function isQuotaIssue(errori: string[]): boolean {
  const joined = errori.join(" ").toLowerCase();
  return (
    joined.includes("quota exceeded") ||
    joined.includes("too many requests") ||
    joined.includes("rate limit") ||
    joined.includes("429")
  );
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractNumericHighlights(text: string): string[] {
  const matches = text.match(/\b\d+(?:[.,]\d+)?(?:-\d+)?%?\b/g) ?? [];
  const unique = [...new Set(matches.map((m) => m.trim()))];
  return unique.slice(0, 8);
}

function sanitizeJournalisticText(text: string): string {
  return sanitizeAINewsBody(text)
    .replace(/\n\nPer chi segue il tennis[\s\S]*?prossime settimane\.?/gi, "")
    .replace(/\n\nDal punto di vista tattico[\s\S]*?al titolo\.?/gi, "")
    .replace(/\n\nImpatto sportivo:[\s\S]*?coinvolti\.?/gi, "")
    .replace(/\n\nNel dettaglio emergono numeri utili[\s\S]*?\.?/gi, "")
    .replace(/\n\nL'aggiornamento e datato[\s\S]*?\.?/gi, "")
    .replace(/\n\nIl passaggio piu rilevante resta[\s\S]*?\.?/gi, "")
    .replace(/\n\nIl quadro si aggiorna al[\s\S]*?tabellone\.?/gi, "")
    .replace(/\n\n[^\n]*(?:video|clip|highlights?|youtube|filmato|guarda)[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatItalianDateLabel(sourceDate: string | null): string | null {
  if (!sourceDate) return null;
  const date = new Date(sourceDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

async function extractArticleContextFromPage(articleUrl: string): Promise<string> {
  try {
    const res = await fetch(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GST-AI-News/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return "";

    const html = await res.text();
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

async function buildFallbackText(
  title: string,
  description: string,
  sourceName: string,
  sourceDate: string | null,
  articleUrl: string | null
) {
  const cleanTitle = title.trim() || "News Tennis";
  const cleanDescription = stripHtml(description || "");
  const articleContext = articleUrl ? await extractArticleContextFromPage(articleUrl) : "";
  const mergedContext = sanitizeAINewsBody(
    [cleanDescription, articleContext].filter(Boolean).join(" ").slice(0, 2200)
  );
  const dettagli = (mergedContext || "La fonte non fornisce un corpo esteso nel feed RSS.")
    .replace(/\s+/g, " ")
    .trim();
  const frasi = dettagli.split(/(?<=[.!?])\s+/).filter((f) => f.length > 35);
  const lead = frasi.slice(0, 2).join(" ") || dettagli;
  const sviluppo = frasi.slice(2, 7).join(" ");

  return {
    titolo: sanitizeAINewsTitle(cleanTitle),
    testo: sanitizeJournalisticText([
      `${cleanTitle}. ${lead}`,
      sviluppo || `La cronaca proposta da ${sourceName} fotografa un passaggio importante del torneo e chiarisce i temi tecnici che possono orientare i prossimi incontri.`,
    ].join("\n\n")),
  };
}

function normalizeNewsCategory(): string {
  return "notizie";
}

function getRomeDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseRssDate(item: Record<string, unknown>): Date | null {
  const rawDate = item.isoDate || item.pubDate || item.published;
  if (typeof rawDate !== "string" || !rawDate.trim()) return null;

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isRecentToday(item: Record<string, unknown>, now: Date): boolean {
  const parsed = parseRssDate(item);
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
    const res = await fetch(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GST-AI-News/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const html = await res.text();
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

async function fetchValidatedImage(imageUrl: string): Promise<{ buffer: ArrayBuffer; contentType: string; ext: string }> {
  const parsed = new URL(imageUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("URL immagine non consentito");
  }

  if (isPrivateHost(parsed.hostname.toLowerCase())) {
    throw new Error("URL immagine non consentito");
  }

  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GST-AI-News/1.0)" },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Impossibile scaricare l'immagine (HTTP ${res.status})`);

  const contentType = res.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
  if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(contentType)) {
    throw new Error("Il link non punta a un'immagine valida");
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > 5 * 1024 * 1024) throw new Error("Immagine troppo grande (max 5MB)");

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return { buffer, contentType, ext: extMap[contentType] || "jpg" };
}

async function resolveNewsImageUrl(sourceUrl: string | null, articleUrl: string | null, seed: string) {
  const candidates: string[] = [];
  if (sourceUrl) candidates.push(sourceUrl);

  if (articleUrl) {
    const pageImage = await extractImageFromArticlePage(articleUrl);
    if (pageImage) candidates.push(pageImage);
  }

  for (const candidate of candidates) {
    try {
      const result = await fetchValidatedImage(candidate);
      const fileName = `news/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${result.ext}`;

      const { error: uploadError } = await supabaseServer.storage.from("avatars").upload(fileName, result.buffer, {
        contentType: result.contentType,
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        continue;
      }

      const { data } = supabaseServer.storage.from("avatars").getPublicUrl(fileName);
      if (data.publicUrl) {
        return data.publicUrl;
      }
    } catch {
      // passa al candidato successivo
    }
  }

  return pickFallbackImage(seed);
}

// Ritorna l'URL della fonte come primo candidato, poi tutte le altre fonti attive
// configurate nel DB come fallback. Nessun URL è hardcoded.
function getFeedCandidates(fonte: { nome: string; url: string }, allFontiUrls: string[]): string[] {
  const others = allFontiUrls.filter((u) => u !== fonte.url);
  return [fonte.url, ...others];
}

async function loadRecentItemsForSource(
  parser: Parser,
  fonte: { nome: string; url: string },
  maxItems: number,
  now: Date,
  allFontiUrls: string[]
): Promise<{ items: Array<Record<string, unknown>>; usedUrl: string | null; reason: string | null }> {
  const candidates = getFeedCandidates(fonte, allFontiUrls);
  let lastReason: string | null = null;

  for (const candidateUrl of candidates) {
    try {
      const feed = await parser.parseURL(candidateUrl);
      const recentItems = (feed.items ?? [])
        .filter((item) => isRecentToday(item as Record<string, unknown>, now))
        .slice(0, maxItems) as Array<Record<string, unknown>>;

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

async function generateFallbackFromRss(categoria: string | null) {
  const parser = new Parser();

  const { data: config } = await supabaseServer
    .from("ai_news_config")
    .select("pubblicazione_auto")
    .order("aggiornato_a", { ascending: false })
    .limit(1)
    .maybeSingle();

  let query = supabaseServer
    .from("ai_news_fonti")
    .select("id, nome, url, categoria")
    .eq("attiva", true);

  if (categoria) {
    query = query.eq("categoria", categoria);
  }

  const { data: fonti, error: fontiError } = await query;
  if (fontiError) throw new Error(fontiError.message);

  let generate = 0;
  let skippate = 0;
  const errori: string[] = [];

  const allFontiUrls = (fonti ?? []).map((f: { url: string }) => f.url);

  for (const fonte of fonti ?? []) {
    try {
      const now = new Date();
      const sourceLoad = await loadRecentItemsForSource(parser, fonte, 2, now, allFontiUrls);
      const articoli = sourceLoad.items;

      if (articoli.length === 0) {
        skippate += 1;
        errori.push(`Fonte ${fonte.nome} senza articoli recenti: ${sourceLoad.reason ?? "nessun dato"}`);
        continue;
      }

      for (const articolo of articoli) {
        const articleTitle = typeof articolo.title === "string" ? articolo.title : "";
        const articleSnippet = typeof articolo.contentSnippet === "string" ? articolo.contentSnippet : "";
        const articleContent = typeof articolo.content === "string" ? articolo.content : "";
        const fonteUrl = firstHttpUrl(articolo.link, articolo.guid);
        if (!fonteUrl) {
          skippate += 1;
          continue;
        }

        const imageUrl = await resolveNewsImageUrl(
          extractRssImageUrl(articolo as Record<string, unknown>),
          fonteUrl,
          `${fonte.nome}-${articleTitle || fonteUrl}`
        );

        const { data: existing } = await supabaseServer
          .from("news")
          .select("id")
          .eq("fonte_url", fonteUrl)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          skippate += 1;
          continue;
        }

        const fallback = await buildFallbackText(
          articleTitle || "News Tennis",
          articleSnippet || articleContent,
          fonte.nome,
          parseRssDate(articolo as Record<string, unknown>)?.toISOString() ?? null,
          fonteUrl
        );

        const stato = config?.pubblicazione_auto ? "pubblicata" : "bozza";
        const isPublished = stato === "pubblicata";

        const { error: insertError } = await supabaseServer.from("news").insert({
          title: fallback.titolo,
          content: fallback.testo,
          excerpt: fallback.testo.slice(0, 220),
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
          skippate += 1;
          errori.push(`Errore inserimento fallback (${fonte.nome}): ${insertError.message}`);
          continue;
        }

        generate += 1;
      }
    } catch (error) {
      errori.push(`Errore fonte fallback ${fonte.nome}: ${error instanceof Error ? error.message : "Errore sconosciuto"}`);
    }
  }

  await supabaseServer.from("ai_news_generation_logs").insert({
    tipo: "manuale",
    generate,
    skippate,
    errori,
  });

  return { generate, skippate, errori, fallback: true };
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminOrGestore();
    if (!authResult.ok) return authResult.response;

    const body = await request.json().catch(() => ({}));
    const categoria = normalizeCategoria(body?.categoria);
    const cronId = typeof body?.cron_id === "string" ? body.cron_id : undefined;

    const data = await callGeneraNewsEdge({
      ...(categoria ? { categoria } : {}),
      ...(cronId ? { cron_id: cronId } : {}),
    });

    const errori = Array.isArray(data?.errori) ? (data.errori as string[]) : [];
    if ((data?.generate ?? 0) === 0 && errori.length > 0 && isQuotaIssue(errori)) {
      const fallbackData = await generateFallbackFromRss(categoria);
      return NextResponse.json({
        ...fallbackData,
        note: "Gemini in quota limit: usata generazione fallback locale.",
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore durante la generazione" },
      { status: 500 }
    );
  }
}
