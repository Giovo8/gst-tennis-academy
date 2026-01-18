"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Newspaper, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Search, Filter, Calendar, X, RefreshCw, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type News = {
  id: string;
  title: string;
  category: string;
  summary?: string;
  content: string;
  excerpt?: string;
  image_url: string | null;
  author_id?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
};

export default function AdminNewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categoryLabels: Record<string, string> = {
    'notizie': 'Notizie',
    'risultati': 'Risultati',
    'eventi': 'Eventi',
    'generale': 'Generale',
    'tornei': 'Tornei',
    'orari': 'Orari',
    'lezioni': 'Lezioni',
    'novità': 'Novità'
  };

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      // Handle error silently
    } else {
      setNews(data || []);
    }
    setLoading(false);
  }

  function resetForm() {
    // Not needed anymore
  }

  function editNews(item: News) {
    // Not needed anymore
  }

  async function handleSubmit(e: React.FormEvent) {
    // Not needed anymore
  }

  async function deleteNews(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa news?")) return;

    const { error } = await supabase.from("news").delete().eq("id", id);

    if (error) {
      alert("Errore durante l'eliminazione: " + error.message);
    } else {
      loadNews();
    }
  }

  async function togglePublished(id: string, currentState: boolean) {
    const newState = !currentState;
    const { error } = await supabase
      .from("news")
      .update({ 
        is_published: newState,
        published_at: newState ? new Date().toISOString() : null,
        updated_at: new Date().toISOString() 
      })
      .eq("id", id);

    if (error) {
      alert("Errore: " + error.message);
    } else {
      loadNews();
    }
  }

  // Filtri
  const filteredNews = news.filter((item) => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: news.length,
    published: news.filter(n => n.is_published).length,
    draft: news.filter(n => !n.is_published).length
  };

  function exportToCSV() {
    const csv = [
      ["Titolo", "Categoria", "Stato", "Data Pubblicazione", "Data Creazione"].join(","),
      ...filteredNews.map((item) => [
        `"${item.title.replace(/"/g, '""')}"`,
        item.category,
        item.is_published ? "Pubblicata" : "Bozza",
        item.published_at ? new Date(item.published_at).toLocaleDateString("it-IT") : "N/A",
        new Date(item.created_at).toLocaleDateString("it-IT")
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `news-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
              GESTIONE NEWS
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-secondary">Gestione News</h1>
                <p className="text-gray-600 font-medium mt-1">Crea e gestisci le news visibili sulla piattaforma</p>
              </div>
              <Link
                href="/dashboard/admin/news/create"
                className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Crea News
              </Link>
            </div>
          </div>
        </div>

        {/* News List */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per titolo o contenuto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 py-3 text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
            />
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-secondary mx-auto mb-3" />
                <p className="text-gray-600">Caricamento news...</p>
              </div>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-secondary">
                {searchQuery || filterCategory !== "all" 
                  ? "Nessuna news trovata" 
                  : "Nessuna news presente"}
              </h3>
              <p className="text-gray-600 mt-1 mb-4">
                {searchQuery || filterCategory !== "all"
                  ? "Prova a modificare i filtri di ricerca"
                  : "Crea la prima news per iniziare!"}
              </p>
              {!(searchQuery || filterCategory !== "all") && (
                <Link
                  href="/dashboard/admin/news/create"
                  className="inline-flex items-center gap-2 text-secondary hover:opacity-80 font-semibold"
                >
                  <Plus className="h-5 w-5" />
                  Crea la prima news
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNews.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/admin/news/create?id=${item.id}`}
                  className="block bg-white rounded-xl border-l-4 border-secondary shadow-md hover:bg-gray-100 transition-all"
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-6">
                    {/* Image */}
                    <div className="flex-shrink-0 w-full sm:w-48 h-32 overflow-hidden rounded-lg">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const placeholder = parent.querySelector('.placeholder');
                              if (placeholder) {
                                (placeholder as HTMLElement).style.display = 'flex';
                              }
                            }
                          }}
                        />
                      ) : null}
                      <div className={`placeholder w-full h-full flex items-center justify-center bg-secondary/5 ${item.image_url ? 'hidden' : ''}`}>
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
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Category */}
                      <span className="inline-block text-xs font-semibold text-secondary mb-2">
                        {categoryLabels[item.category] || item.category}
                      </span>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-secondary mb-2 hover:opacity-70 transition-opacity line-clamp-2">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {item.excerpt || item.content.substring(0, 150)}
                      </p>

                      {/* Status indicator */}
                      <div className="flex items-center gap-4 text-xs text-secondary/50 mt-2">
                        <span>{new Date(item.created_at).toLocaleDateString("it-IT")}</span>
                        {!item.is_published && (
                          <>
                            <span>•</span>
                            <span className="text-orange-600 font-semibold">Bozza</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
