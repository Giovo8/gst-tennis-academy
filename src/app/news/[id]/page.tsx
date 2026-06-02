import { notFound } from "next/navigation";
import Link from "next/link";
import PublicNavbar from "@/components/layout/PublicNavbar";
import NewsShareButtons from "@/components/news/NewsShareButtons";
import env from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";
import { sanitizeAINewsBody, sanitizeAINewsTitle } from "@/lib/ai-news/contentSanitizer";

type NewsPost = {
  id: string;
  title: string;
  category: string;
  image_url: string | null;
  fonte_url?: string | null;
  stato?: string | null;
  content: string;
  excerpt?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
};

function isPublishedNews(post: Partial<NewsPost> & { stato?: string | null } | null | undefined): boolean {
  if (!post) return false;
  if (typeof post.is_published === "boolean") return post.is_published;
  return String(post.stato ?? "").toLowerCase() === "pubblicata";
}

function normalizeLegacyTitle(title: string): string {
  return title.replace(/\s*\.\.\.$/, "").trim();
}

function formatCategoryLabel(category: string | null | undefined): string {
  const safeCategory = String(category ?? "notizie").trim();
  if (!safeCategory) return "Notizie";
  return safeCategory.charAt(0).toUpperCase() + safeCategory.slice(1);
}

function renderBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

async function recoverTitleFromSource(sourceUrl: string): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GST-News/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) return null;

    const html = await response.text();
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const twitterTitle = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
    const documentTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1];

    const candidate = (ogTitle || twitterTitle || documentTitle || "").trim();
    if (!candidate) return null;

    return candidate.replace(/\s*\|\s*.*$/, "").replace(/\s*-\s*.*$/, "").trim();
  } catch {
    return null;
  }
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.toLocaleDateString("it-IT", { month: "long" });
  const monthCapitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return `${day} ${monthCapitalized} ${year}`;
};

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("news")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !post || !isPublishedNews(post as NewsPost)) {
    notFound();
  }

  const { data: relatedPostsRaw } = await supabase
    .from("news")
    .select("*")
    .eq("category", post.category)
    .neq("id", id)
    .order("published_at", { ascending: false })
    .limit(20);

  const typedPost = post as NewsPost;
  const sanitizedPost: NewsPost = {
    ...typedPost,
    title: sanitizeAINewsTitle(typedPost.title || ""),
    content: sanitizeAINewsBody(typedPost.content || ""),
    excerpt: typedPost.excerpt ? sanitizeAINewsBody(typedPost.excerpt) : typedPost.excerpt,
  };
  const typedRelated = ((relatedPostsRaw ?? []) as NewsPost[])
    .filter((item) => isPublishedNews(item))
    .slice(0, 3)
    .map((item) => ({
    ...item,
    title: sanitizeAINewsTitle(item.title || ""),
    content: sanitizeAINewsBody(item.content || ""),
    excerpt: item.excerpt ? sanitizeAINewsBody(item.excerpt) : item.excerpt,
  }));
  const normalizedStoredTitle = normalizeLegacyTitle(sanitizedPost.title);
  const shouldRecoverTitle = sanitizedPost.title.trim().endsWith("...") && Boolean(sanitizedPost.fonte_url);
  const recoveredTitle = shouldRecoverTitle && typedPost.fonte_url
    ? await recoverTitleFromSource(sanitizedPost.fonte_url)
    : null;
  const displayTitle = recoveredTitle || normalizedStoredTitle;
  const baseUrl = env.publicSiteUrl.replace(/\/$/, "");
  const shareUrl = `${baseUrl}/news/${id}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto bg-white">
        <PublicNavbar />
        <main>
          {/* Hero Image */}
          {sanitizedPost.image_url && (
            <div className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 pt-6 mb-8">
              <div className="w-full aspect-[16/9] overflow-hidden rounded-2xl">
                <img
                  src={sanitizedPost.image_url}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Article Content */}
          <article className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 pb-12">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-8 leading-tight tracking-tight">
              {displayTitle}
            </h1>

            {/* Meta information */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-secondary/70">
              <span className="font-semibold">
                {formatCategoryLabel(typedPost.category)}
              </span>
              <time dateTime={sanitizedPost.published_at || sanitizedPost.created_at}>
                {formatDate(sanitizedPost.published_at || sanitizedPost.created_at)}
              </time>
            </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-secondary/90">
            {sanitizedPost.content.split("\n").map((paragraph, index) => {
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
                    {renderBoldText(paragraph.substring(2))}
                  </li>
                );
              }
              if (paragraph.trim() === "") {
                return <br key={index} />;
              }
              return (
                <p
                  key={index}
                  className="mb-4 leading-relaxed"
                >
                  {renderBoldText(paragraph)}
                </p>
              );
            })}
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <NewsShareButtons url={shareUrl} title={displayTitle} />
          </div>
          </article>

          {/* Related Posts */}
          {typedRelated.length > 0 && (
            <section className="mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 py-16 border-t border-gray-200">
              <h2 className="text-2xl sm:text-3xl font-bold text-secondary mb-8 tracking-tight">
                Articoli correlati
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {typedRelated.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/news/${relatedPost.id}`}
                    className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  >
                    <div className="w-full aspect-[16/9] overflow-hidden">
                      {relatedPost.image_url ? (
                        <img
                          src={relatedPost.image_url}
                          alt={normalizeLegacyTitle(relatedPost.title)}
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
                    <div className="flex flex-col flex-grow p-7">
                      <h3 className="text-xl font-bold text-secondary mb-3 tracking-tight leading-tight group-hover:text-secondary/80 transition-colors">
                        {normalizeLegacyTitle(relatedPost.title)}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 flex-grow mb-5">
                        {relatedPost.excerpt || relatedPost.content.substring(0, 100)}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span className="text-xs text-gray-400">
                          {formatDate(relatedPost.published_at || relatedPost.created_at)}
                        </span>
                        <span className="text-xs font-semibold text-secondary">
                          {formatCategoryLabel(relatedPost.category)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
