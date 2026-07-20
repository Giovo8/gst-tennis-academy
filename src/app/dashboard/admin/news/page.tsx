"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Newspaper, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Search, Filter, Calendar, X, RefreshCw, Download, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { toast } from 'sonner';

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
  const [aiBozzeCount, setAiBozzeCount] = useState(0);
  const [deletingDrafts, setDeletingDrafts] = useState(false);

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

  async function loadNews() {
    setLoading(true);
    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from("news")
        .select("*")
        .order("published_at", { ascending: false }),
      supabase
        .from("news")
        .select("id", { count: "exact", head: true })
        .eq("ai_generated", true)
        .eq("stato", "bozza"),
    ]);

    if (error) {
      // Handle error silently
    } else {
      setNews(data || []);
      setAiBozzeCount(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadNews();
  }, []);

  function resetForm() {
    // Not needed anymore
  }

  function editNews(item: News) {
    // Not needed anymore
  }

  async function handleSubmit(e: React.FormEvent) {
    // Not needed anymore
  }

  async function deleteNews(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Sei sicuro di voler eliminare questa news?")) return;

    const { error } = await supabase.from("news").delete().eq("id", id);

    if (error) {
      toast.error("Errore durante l'eliminazione: " + error.message);
    } else {
      loadNews();
    }
  }

  async function deleteAllDrafts() {
    const drafts = news.filter((n) => !n.is_published);
    if (drafts.length === 0) { toast.info("Nessuna bozza da eliminare"); return; }
    if (!confirm(`Sei sicuro di voler eliminare ${drafts.length} bozze? Questa azione è irreversibile.`)) return;

    setDeletingDrafts(true);
    const ids = drafts.map((n) => n.id);
    const { error } = await supabase.from("news").delete().in("id", ids);
    setDeletingDrafts(false);

    if (error) {
      toast.error("Errore durante l'eliminazione: " + error.message);
    } else {
      toast.success(`${ids.length} bozze eliminate`);
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
      toast.error("Errore: " + error.message);
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
      <div className="space-y-6 pt-3">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="breadcrumb text-secondary/60">Gestione News</p>
                <h1 className="text-4xl font-bold text-secondary">Gestione News</h1>
              </div>
              <div className="flex flex-1 flex-col gap-2 sm:flex-none sm:flex-row sm:items-center">
                <Link
                  href="/dashboard/admin/news/create"
                  className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Crea News
                </Link>
                {news.some((n) => !n.is_published) && (
                  <button
                    onClick={deleteAllDrafts}
                    disabled={deletingDrafts}
                    className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {deletingDrafts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Elimina bozze
                  </button>
                )}
                <Link
                  href="/dashboard/admin/news/ai"
                  title="Apri News AI (Gemini)"
                  aria-label="Apri News AI (Gemini)"
                  className="relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-black/10 bg-white text-secondary shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300"
                >
                  <Sparkles className="h-4 w-4" />
                  {aiBozzeCount > 0 && (
                    <span className="absolute -top-2 -right-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {aiBozzeCount}
                    </span>
                  )}
                </Link>
              </div>
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
              className="w-full rounded-xl border border-black/10 bg-white pl-12 pr-4 py-3 text-secondary placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-black/10"
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
            <div className="page-card text-center py-12">
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
            <div className="page-card divide-y divide-gray-100">
              {filteredNews.map((item) => (
                <Link
                  key={item.id}
                  href={`/dashboard/admin/news/${item.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  {/* Immagine thumbnail */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-secondary/5">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-secondary/20" />
                      </div>
                    )}
                  </div>

                  {/* Titolo + categoria */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-secondary text-sm truncate">{item.title}</p>
                    <p className="text-xs text-secondary/50 mt-0.5">
                      {categoryLabels[item.category] || item.category}
                      {" · "}
                      {new Date(item.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>

                  {/* Badge stato */}
                  <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    item.is_published
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {item.is_published ? "Pubblicata" : "Bozza"}
                  </span>
                  <button
                    onClick={(e) => deleteNews(item.id, e)}
                    className="flex-shrink-0 p-1.5 text-secondary/30 hover:text-red-600 transition-colors rounded"
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
