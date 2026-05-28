import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import Link from "next/link";
import PublicNavbar from "@/components/layout/PublicNavbar";
import { supabaseServer } from "@/lib/supabase/serverClient";
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

  const { data: post, error } = await supabaseServer
    .from("news")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !post) {
    notFound();
  }

  const { data: relatedPosts } = await supabaseServer
    .from("news")
    .select("*")
    .eq("is_published", true)
    .eq("category", post.category)
    .neq("id", id)
    .order("published_at", { ascending: false })
    .limit(3);

  const typedPost = post as NewsPost;
  const typedRelated = (relatedPosts ?? []) as NewsPost[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto bg-white">
        <PublicNavbar />
        <main>
          {/* Back link */}
          <div className="mx-auto max-w-4xl px-6 sm:px-6 lg:px-8 pt-10">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-sm text-secondary/60 hover:text-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tutte le news
            </Link>
          </div>

          {/* Hero Image */}
          {typedPost.image_url && (
            <div className="mx-auto max-w-4xl px-6 sm:px-6 lg:px-8 pt-6 mb-8">
              <div className="w-full aspect-[16/9] overflow-hidden rounded-2xl">
                <img
                  src={typedPost.image_url}
                  alt={typedPost.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Article Content */}
          <article className="mx-auto max-w-4xl px-6 sm:px-6 lg:px-8 pb-12">
            {/* Meta information */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center text-sm text-secondary/70">
                <Tag className="w-4 h-4 mr-2" />
                <span className="font-semibold">
                  {typedPost.category.charAt(0).toUpperCase() + typedPost.category.slice(1)}
                </span>
              </div>
              <div className="flex items-center text-sm text-secondary/70">
                <Calendar className="w-4 h-4 mr-2" />
                <time dateTime={typedPost.published_at || typedPost.created_at}>
                  {formatDate(typedPost.published_at || typedPost.created_at)}
                </time>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-8 leading-tight tracking-tight">
              {typedPost.title}
            </h1>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-secondary/90">
            {typedPost.content.split("\n").map((paragraph, index) => {
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
                    <div className="flex flex-col flex-grow p-7">
                      <h3 className="text-xl font-bold text-secondary mb-3 tracking-tight leading-tight group-hover:text-secondary/80 transition-colors">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 flex-grow mb-5">
                        {relatedPost.excerpt || relatedPost.content.substring(0, 100)}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span className="text-xs text-gray-400">
                          {formatDate(relatedPost.published_at || relatedPost.created_at)}
                        </span>
                        <span className="text-xs font-semibold text-secondary">
                          {relatedPost.category.charAt(0).toUpperCase() + relatedPost.category.slice(1)}
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
