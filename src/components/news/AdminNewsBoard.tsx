"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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

const defaultPosts: NewsPost[] = [
  {
    id: "n1",
    title: "Stage intensivo pre-torneo",
    category: "Eventi",
    image_url: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=800&q=80",
    content: "Settimana di match play, video analysis e preparazione atletica per il calendario invernale.",
    is_published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "n2",
    title: "Nuove divise team GST",
    category: "Novità",
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    content: "Disponibili le nuove divise ufficiali per team agonistico e junior academy.",
    is_published: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "n3",
    title: "Campionato invernale, i vincitori della settimana",
    category: "Risultati",
    image_url: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80",
    content: "Rossi e Bianchi dominano il torneo singolare. Gallo e Moretti vincono il doppio misto.",
    is_published: true,
    created_at: new Date().toISOString(),
  },
];

export default function AdminNewsBoard() {
  const [posts, setPosts] = useState<NewsPost[]>(defaultPosts);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("tutte");

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error loading news:", error);
      setPosts(defaultPosts);
    } else if (data && data.length > 0) {
      setPosts(data);
    } else {
      setPosts(defaultPosts);
    }
    setLoading(false);
  }

  const categories = Array.from(new Set(posts.map((post) => post.category))).filter(
    (cat) => !!cat
  );

  const filteredPosts = posts.filter((post) =>
    activeCategory === "tutte" ? true : post.category === activeCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Filters */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setActiveCategory("tutte")}
          className={`text-sm px-4 py-2 border transition-colors ${
            activeCategory === "tutte"
              ? "border-secondary bg-white text-secondary font-medium"
              : "border-transparent text-secondary/70 hover:text-secondary"
          }`}
        >
          Tutte
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-sm px-4 py-2 border transition-colors ${
              activeCategory === cat
                ? "border-secondary bg-white text-secondary font-medium"
                : "border-transparent text-secondary/70 hover:text-secondary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredPosts.map((post) => {
          const readTime = "5 min read";

          return (
            <article key={post.id} className="flex flex-col group">
              {/* Image */}
              <div className="w-full aspect-[4/3] mb-4 overflow-hidden">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/5">
                    <svg
                      className="w-16 h-16 sm:w-20 sm:h-20 text-secondary/20"
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

              {/* Meta info */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-secondary">
                  {post.category}
                </span>
                <span className="text-xs text-secondary/60">
                  {readTime}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-secondary mb-2 group-hover:opacity-80 transition-opacity">
                {post.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-secondary/70 mb-4 line-clamp-2 flex-grow">
                {post.excerpt || post.content.substring(0, 120)}
              </p>

              {/* Link */}
              <Link
                href={`/news/${post.id}`}
                className="inline-flex items-center text-sm font-semibold text-secondary hover:opacity-70 transition-opacity group/link"
              >
                Leggi tutto
                <svg 
                  className="w-4 h-4 ml-1 transition-transform group-hover/link:translate-x-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}


