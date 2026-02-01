"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Calendar, Tag } from "lucide-react";
import Link from "next/link";
import PublicNavbar from "@/components/layout/PublicNavbar";
import { supabase } from "@/lib/supabase/client";
import { sanitizeHtml } from "@/lib/security/sanitize";

type NewsPost = {
  id: string;
  title: string;
  category: string;
  image_url: string | null;
  content: string;
  excerpt?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
};

const defaultPosts: Record<string, NewsPost> = {
  n1: {
    id: "n1",
    title: "Stage intensivo pre-torneo",
    category: "Eventi",
    image_url:
      "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80",
    content: `
# Stage intensivo pre-torneo

Siamo entusiasti di annunciare il nostro stage intensivo pre-torneo, un'opportunità unica per prepararsi al meglio per il calendario invernale.

## Programma dello stage

Lo stage si articolerà su una settimana completa con:

- **Match play intensivi**: sessioni giornaliere di gioco competitivo per affinare la strategia
- **Video analysis**: analisi dettagliata dei tuoi match per identificare punti di forza e aree di miglioramento
- **Preparazione atletica**: allenamenti specifici per ottimizzare la condizione fisica
- **Mental coaching**: sessioni dedicate all'aspetto mentale del tennis competitivo

## Chi può partecipare

Lo stage è aperto a tutti i giocatori agonisti dell'academy, con particolare focus sui livelli intermedio e avanzato.

## Quando e dove

- **Date**: 15-22 gennaio 2026
- **Orari**: 9:00-17:00 con pausa pranzo
- **Luogo**: Campi interni ed esterni del GST Tennis Academy

## Iscrizioni

Le iscrizioni sono aperte fino al 10 gennaio. Posti limitati!

Per informazioni e iscrizioni, contattare la segreteria dell'academy.
    `,
    is_published: true,
    published_at: "2026-01-03T10:00:00Z",
    created_at: "2026-01-03T10:00:00Z",
  },
  n2: {
    id: "n2",
    title: "Nuove divise team GST",
    category: "Novità",
    image_url:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    content: `
# Nuove divise team GST

È con grande piacere che presentiamo le nuove divise ufficiali del GST Tennis Academy!

## Design e caratteristiche

Le nuove divise sono state progettate con particolare attenzione a:

- **Comfort**: tessuti tecnici traspiranti e anti-sudore
- **Performance**: materiali che favoriscono la libertà di movimento
- **Stile**: design moderno che riflette l'identità della nostra academy

## Disponibilità

Le divise sono disponibili per:

- Team agonistico senior
- Junior academy
- Staff tecnico

### Taglie disponibili

Da XS a XXL, sia per uomo che per donna, con modelli specifici per giovani atleti.

## Come ordinare

Le ordinazioni possono essere effettuate presso la segreteria dell'academy. Ogni divisa include:

- Polo da gioco (2 colori disponibili)
- Pantaloncini/gonna
- Tuta da riscaldamento
- Borsa porta racchette con logo GST

**Prezzi speciali per i primi ordini!**

Visita la segreteria per provare le taglie e effettuare il tuo ordine.
    `,
    is_published: true,
    published_at: "2026-01-02T14:00:00Z",
    created_at: "2026-01-02T14:00:00Z",
  },
  n3: {
    id: "n3",
    title: "Campionato invernale, i vincitori della settimana",
    category: "Risultati",
    image_url:
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
    content: `
# Campionato invernale - Risultati della settimana

Si è conclusa con grande successo un'altra settimana del campionato invernale GST!

## Singolare Maschile

**Finale**: Marco Rossi vs. Andrea Verdi

Marco Rossi si aggiudica il titolo con un convincente 6-3, 6-4. Una prestazione impeccabile che conferma il suo momento di forma eccellente.

### Highlights

- Service vincenti: 8
- Break point convertiti: 4/7
- Percentuale prime palle: 72%

## Singolare Femminile

**Finale**: Laura Bianchi vs. Sofia Neri

Laura Bianchi domina l'incontro chiudendo 6-2, 6-1. La sua aggressività da fondo campo ha fatto la differenza.

## Doppio Misto

**Finale**: Gallo/Moretti vs. Ricci/Ferrari

La coppia Gallo/Moretti trionfa al tie-break del terzo set con il punteggio di 6-4, 3-6, 10-8.

Un match tiratissimo che ha regalato grandi emozioni al pubblico presente.

## Classifiche aggiornate

Le classifiche complete sono disponibili nella sezione dedicata del sito.

## Prossimi appuntamenti

Il torneo continua la prossima settimana con le semifinali della categoria Open.

**Non perdere l'occasione di partecipare o di venire a fare il tifo!**

Per iscrizioni agli eventi futuri, contattare la segreteria.
    `,
    is_published: true,
    published_at: "2026-01-01T16:00:00Z",
    created_at: "2026-01-01T16:00:00Z",
  },
};

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<NewsPost[]>([]);

  const id = params.id as string;

  useEffect(() => {
    loadNewsPost();
  }, [id]);

  async function loadNewsPost() {
    setLoading(true);

    // Try to load from database
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .single();

    if (error || !data) {
      // Fallback to default posts
      const defaultPost = defaultPosts[id];
      if (defaultPost) {
        setPost(defaultPost);
        loadRelatedPosts(defaultPost.category);
      } else {
        setPost(null);
      }
    } else {
      setPost(data);
      loadRelatedPosts(data.category);
    }

    setLoading(false);
  }

  async function loadRelatedPosts(category: string) {
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .eq("is_published", true)
      .eq("category", category)
      .neq("id", id)
      .order("published_at", { ascending: false })
      .limit(3);

    if (!error && data && data.length > 0) {
      setRelatedPosts(data);
    } else {
      // Fallback to default posts
      const related = Object.values(defaultPosts)
        .filter((p) => p.category === category && p.id !== id)
        .slice(0, 3);
      setRelatedPosts(related);
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const year = date.getFullYear();
    const month = date.toLocaleDateString("it-IT", { month: "long" });
    const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} ${monthCapitalized} ${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <PublicNavbar />
        <main className="bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <PublicNavbar />
        <main className="bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-secondary mb-4">
                Articolo non trovato
              </h1>
              <p className="text-secondary/70 mb-8">
                L&apos;articolo che stai cercando non esiste o non è più disponibile.
              </p>
              <Link
                href="/news"
                className="inline-flex items-center text-secondary hover:opacity-70 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alle news
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="bg-white">
        {/* Hero Image */}
        {post.image_url && (
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 mb-8">
            <div className="w-full aspect-[16/9] overflow-hidden rounded-lg">
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Article Content */}
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center text-sm text-secondary/70">
              <Tag className="w-4 h-4 mr-2" />
              <span className="font-semibold">
                {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
              </span>
            </div>
            <div className="flex items-center text-sm text-secondary/70">
              <Calendar className="w-4 h-4 mr-2" />
              <time dateTime={post.published_at || post.created_at}>
                {formatDate(post.published_at || post.created_at)}
              </time>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-6">
            {post.title}
          </h1>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-secondary/90">
            {post.content.split("\n").map((paragraph, index) => {
              // Handle markdown-like syntax
              if (paragraph.startsWith("# ")) {
                return (
                  <h1 key={index} className="text-3xl font-bold text-secondary mt-8 mb-4">
                    {paragraph.substring(2)}
                  </h1>
                );
              }
              if (paragraph.startsWith("## ")) {
                return (
                  <h2 key={index} className="text-2xl font-bold text-secondary mt-6 mb-3">
                    {paragraph.substring(3)}
                  </h2>
                );
              }
              if (paragraph.startsWith("### ")) {
                return (
                  <h3 key={index} className="text-xl font-bold text-secondary mt-4 mb-2">
                    {paragraph.substring(4)}
                  </h3>
                );
              }
              if (paragraph.startsWith("- ")) {
                return (
                  <li key={index} className="ml-6 mb-2">
                    {paragraph.substring(2).replace(/\*\*(.*?)\*\*/g, (_, text) => text)}
                  </li>
                );
              }
              if (paragraph.trim() === "") {
                return <br key={index} />;
              }
              // Handle bold text **text** and sanitize HTML
              const contentWithBold = paragraph.replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="font-semibold">$1</strong>'
              );
              // Sanitize HTML to prevent XSS
              const sanitized = sanitizeHtml(contentWithBold);
              return (
                <p
                  key={index}
                  className="mb-4 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitized }}
                />
              );
            })}
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
            <h2 className="text-2xl sm:text-3xl font-bold text-secondary mb-8">
              Articoli correlati
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={`/news/${relatedPost.id}`}
                  className="group"
                >
                  <article className="flex flex-col">
                    {/* Image */}
                    <div className="w-full aspect-[4/3] mb-4 overflow-hidden rounded-lg">
                      {relatedPost.image_url ? (
                        <img
                          src={relatedPost.image_url}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary/5">
                          <svg
                            className="w-12 h-12 text-secondary/20"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <span className="text-xs font-semibold text-secondary mb-2">
                      {relatedPost.category}
                    </span>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-secondary group-hover:opacity-70 transition-opacity">
                      {relatedPost.title}
                    </h3>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
