"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { Newspaper, Plus, Trash2, Loader2, Search, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

type News = {
  id: string;
  title: string;
  category: string;
  content: string;
  image_url: string | null;
  is_published: boolean;
  created_at: string;
};

export default function AdminNewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiBozzeCount, setAiBozzeCount] = useState(0);
  const [deletingDrafts, setDeletingDrafts] = useState(false);

  const categoryLabels: Record<string, string> = {
    notizie: "Notizie",
    risultati: "Risultati",
    eventi: "Eventi",
    generale: "Generale",
    tornei: "Tornei",
    orari: "Orari",
    lezioni: "Lezioni",
    novità: "Novità",
  };

  async function loadNews() {
    try {
      const [{ data, error }, { count }] = await Promise.all([
        supabase.from("news").select("*").order("published_at", { ascending: false }),
        supabase
          .from("news")
          .select("id", { count: "exact", head: true })
          .eq("ai_generated", true)
          .eq("stato", "bozza"),
      ]);

      if (error) throw error;
      setNews(data || []);
      setAiBozzeCount(count ?? 0);
    } catch (error) {
      console.error("Error loading news:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  async function deleteAllDrafts() {
    const drafts = news.filter((n) => !n.is_published);
    if (drafts.length === 0) {
      toast.info("Nessuna bozza da eliminare");
      return;
    }
    if (!confirm(`Sei sicuro di voler eliminare ${drafts.length} bozze? Questa azione è irreversibile.`)) return;

    setDeletingDrafts(true);
    const ids = drafts.map((n) => n.id);
    const { error } = await supabase.from("news").delete().in("id", ids);
    setDeletingDrafts(false);

    if (error) {
      toast.error("Errore durante l'eliminazione: " + error.message);
    } else {
      toast.success(`${ids.length} bozze eliminate`);
      void loadNews();
    }
  }

  const filteredNews = news.filter((item) => {
    if (!searchQuery) return true;
    return (
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6 pt-3">
        {/* Header */}
        <div>
          <p className="breadcrumb text-secondary/60">Gestione News</p>
          <h1 className="text-4xl font-bold text-secondary">Gestione News</h1>
        </div>

        {/* Header actions */}
        <div className="w-full flex items-center gap-2">
          <Link
            href="/dashboard/admin/news/create"
            className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Crea News</span>
          </Link>
          {news.some((n) => !n.is_published) && (
            <button
              onClick={deleteAllDrafts}
              disabled={deletingDrafts}
              className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-[#023b52] rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {deletingDrafts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span>Elimina bozze</span>
            </button>
          )}
          <Link
            href="/dashboard/admin/news/ai"
            title="Apri News AI (Gemini)"
            className="relative flex-1 px-4 py-3 text-sm font-semibold text-white bg-[#023047] rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>News AI</span>
            {aiBozzeCount > 0 && (
              <span className="absolute -top-2 -right-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {aiBozzeCount}
              </span>
            )}
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per titolo o contenuto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
          />
        </div>

        {/* News List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-secondary" />
            <p className="mt-4 text-gray-600">Caricamento news...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="page-card p-12 text-center">
            <Newspaper className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna news trovata</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? "Prova a modificare i filtri di ricerca" : "Crea la prima news per iniziare"}
            </p>
            {!searchQuery && (
              <Link
                href="/dashboard/admin/news/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all"
              >
                <Plus className="h-5 w-5" />
                <span>Crea Prima News</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNews.map((item) => {
              const categoryLabel = categoryLabels[item.category] || item.category;
              const meta = [format(new Date(item.created_at), "d MMM yyyy", { locale: it }), categoryLabel]
                .filter(Boolean)
                .join(" · ");

              return (
                <Link
                  key={item.id}
                  href={`/dashboard/admin/news/${item.id}`}
                  className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                  style={{
                    background: item.is_published ? "var(--color-frozen-lake-900)" : "#9ca3af",
                  }}
                >
                  <div className="flex items-center gap-3 px-3 py-3.5">
                    <div className="flex h-10 aspect-video flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Newspaper className="h-4 w-4 text-white/50" strokeWidth={2} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{item.title}</p>
                      <p className="text-xs text-white/70 mt-0.5 truncate">{meta}</p>
                    </div>

                    {!item.is_published && (
                      <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded bg-white/20 text-white">
                        Bozza
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
