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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-2 flex items-center gap-3">
              <Newspaper className="h-8 w-8" />
              Gestione News
            </h1>
            <p className="text-secondary/70 font-medium">Crea e gestisci le news visibili sulla piattaforma</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/dashboard/admin/news/create"
              className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Crea News
            </Link>
            <Link
              href="/news"
              target="_blank"
              className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Visualizza News
            </Link>
          </div>
        </div>

        {/* News List */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
              <input
                type="text"
                placeholder="Cerca per titolo o contenuto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterCategory("all")}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  filterCategory === "all"
                    ? "text-white bg-secondary hover:opacity-90"
                    : "bg-white text-secondary/70 hover:bg-secondary/5"
                }`}
              >
                <Filter className="inline-block w-4 h-4 mr-1.5" />
                Tutte
              </button>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilterCategory(value)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    filterCategory === value
                      ? "text-white bg-secondary hover:opacity-90"
                      : "bg-white text-secondary/70 hover:bg-secondary/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-xl">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-secondary mx-auto mb-3" />
                <p className="text-secondary/60">Caricamento news...</p>
              </div>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-secondary/10">
              <Newspaper className="h-16 w-16 text-secondary/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary mb-2">
                {searchQuery || filterCategory !== "all" 
                  ? "Nessuna news trovata" 
                  : "Nessuna news presente"}
              </h3>
              <p className="text-secondary/60 mb-4">
                {searchQuery || filterCategory !== "all"
                  ? "Prova a modificare i filtri di ricerca"
                  : "Crea la prima news per iniziare!"}
              </p>
              {(searchQuery || filterCategory !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterCategory("all");
                  }}
                  className="text-sm text-secondary hover:underline"
                >
                  Ripristina filtri
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNews.map((item) => (
                <article
                  key={item.id}
                  className="bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = `/news/${item.id}`}
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4">
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
                      <p className="text-sm text-secondary/70 line-clamp-2 mb-3">
                        {item.excerpt || item.content.substring(0, 150)}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/admin/news/create?id=${item.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-md bg-secondary/10 hover:bg-secondary/20 text-secondary transition-colors"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNews(item.id);
                          }}
                          className="p-2 rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
