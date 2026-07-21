import sharp from "sharp";
import logger from "@/lib/logger/secure-logger";

/**
 * Ottimizzazione immagini prima dell'upload su Supabase Storage.
 *
 * Le immagini delle news arrivano dalle fonti RSS a risoluzione piena (anche 3-5 MB)
 * ma vengono mostrate in card da ~400px: servirle intatte era la voce principale
 * di consumo di egress CDN. Qui vengono ridimensionate e convertite in WebP.
 */

export type OptimizedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

type OptimizeOptions = {
  /** Larghezza massima in px (l'altezza segue le proporzioni). Default 1280. */
  maxWidth?: number;
  /** Qualità WebP 1-100. Default 80. */
  quality?: number;
};

/**
 * Ridimensiona e converte in WebP. Se l'ottimizzazione fallisce o non conviene
 * (risultato più pesante dell'originale) restituisce l'input invariato.
 */
export async function optimizeImage(
  input: ArrayBuffer | Buffer,
  originalContentType: string,
  originalExt: string,
  options: OptimizeOptions = {}
): Promise<OptimizedImage> {
  const { maxWidth = 1280, quality = 80 } = options;
  const inputBuffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  const passthrough: OptimizedImage = {
    buffer: inputBuffer,
    contentType: originalContentType,
    ext: originalExt,
  };

  // Le GIF animate perderebbero l'animazione: meglio lasciarle intatte.
  if (originalContentType === "image/gif") {
    return passthrough;
  }

  try {
    const optimized = await sharp(inputBuffer)
      .rotate() // rispetta l'orientamento EXIF prima di scartare i metadati
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    if (optimized.byteLength >= inputBuffer.byteLength) {
      return passthrough;
    }

    return { buffer: optimized, contentType: "image/webp", ext: "webp" };
  } catch (error) {
    logger.warn("Ottimizzazione immagine fallita, uso l'originale", {
      error: error instanceof Error ? error.message : "errore sconosciuto",
    });
    return passthrough;
  }
}
