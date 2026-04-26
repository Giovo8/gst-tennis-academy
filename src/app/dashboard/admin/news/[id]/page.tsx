"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

type NewsItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  excerpt?: string;
  image_url: string | null;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at?: string;
};

export default function AdminNewsDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const newsId = params?.id;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    async function loadNews() {
      if (!newsId) return;

      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from("news")
        .select("*")
        .eq("id", newsId)
        .single();

      if (loadError || !data) {
        setError("News non trovata");
        setNews(null);
      } else {
        setNews(data);
      }

      setLoading(false);
    }

    loadNews();
  }, [newsId]);

  async function handleDelete() {
    if (!newsId) return;

    const confirmed = confirm("Sei sicuro di voler eliminare questa news?");
    if (!confirmed) return;

    setDeleting(true);

    const { error: deleteError } = await supabase.from("news").delete().eq("id", newsId);

    if (deleteError) {
      setError(deleteError.message || "Errore durante l'eliminazione");
      setDeleting(false);
      return;
    }

    router.push("/dashboard/admin/news");
  }

  if (loading) {
    return (
      <AuthGuard allowedRoles={["admin", "gestore"]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      </AuthGuard>
    );
  }

  if (!news) {
    return (
      <AuthGuard allowedRoles={["admin", "gestore"]}>
        <div className="space-y-6">
          <div>
            <p className="breadcrumb text-secondary/60">
              <Link href="/dashboard/admin/news" className="hover:text-secondary/80 transition-colors">News</Link>
              {" › "}
              <span>Dettaglio News</span>
            </p>
            <h1 className="text-4xl font-bold text-secondary">Dettaglio News</h1>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-secondary/60">{error || "News non trovata"}</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        <div>
          <p className="breadcrumb text-secondary/60">
            <Link href="/dashboard/admin/news" className="hover:text-secondary/80 transition-colors">News</Link>
            {" › "}
            <span>Dettaglio News</span>
          </p>
          <h1 className="text-4xl font-bold text-secondary">Dettaglio News</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni News</h2>
          </div>

          <div className="p-6 space-y-6">
            {news.image_url && (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-secondary/5">
                <img src={news.image_url} alt={news.title} className="w-full h-auto object-cover" />
              </div>
            )}

            <div className="space-y-2">
              <span className="inline-block text-xs font-semibold text-secondary">
                {categoryLabels[news.category] || news.category}
              </span>
              <h3 className="text-2xl font-bold text-secondary">{news.title}</h3>
            </div>

            <p className="text-sm text-secondary/70">
              {new Date(news.created_at).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>

            <div className="text-secondary leading-relaxed whitespace-pre-wrap">
              {news.content}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Elimina"}
          </button>

          <Link
            href={`/dashboard/admin/news/create?id=${news.id}`}
            className="w-full flex items-center justify-center px-6 py-3 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 transition-all"
          >
            Modifica News
          </Link>
        </div>
      </div>
    </AuthGuard>
  );
}
