'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

import { getSessionUser } from '@/lib/auth/clientSession';
import { Video, Loader2, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function getYouTubeVideoId(url: string) {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
  );
  return match ? match[1] : null;
}

interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  level: string;
  duration_minutes: number | null;
  watched_at: string | null;
  watch_count: number;
  created_at: string;
  creator?: {
    full_name: string;
  };
}

export default function AtletaVideosPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const pathname = usePathname();
  const basePath = pathname.split('/videos')[0];
  const isMaestroView = pathname.startsWith('/dashboard/maestro');

  const categories = [
    { value: 'generale', label: 'Generale' },
    { value: 'tecnica', label: 'Tecnica' },
    { value: 'tattica', label: 'Tattica' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'mentale', label: 'Mentale' },
  ];

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    setLoading(true);

    const {
      data: { user },
    } = await getSessionUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (sessionError || !token) {
        throw new Error('Sessione non valida. Effettua nuovamente il login.');
      }

      const response = await fetch('/api/video-lessons', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Errore durante il caricamento dei video');
      }

      const videosData = payload?.videos || [];

      if (videosData.length === 0) {
        setVideos([]);
        return;
      }

      const creatorIds = [...new Set(videosData.map((v: any) => v.created_by).filter(Boolean))];
      let creatorsMap = new Map();

      if (creatorIds.length > 0) {
        const { data: creatorsData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);

        if (creatorsData) {
          creatorsMap = new Map(creatorsData.map((c) => [c.id, c]));
        }
      }

      const enrichedVideos = videosData.map((video: any) => ({
        ...video,
        creator: video.created_by ? creatorsMap.get(video.created_by) : null,
      }));

      setVideos(enrichedVideos);
    } catch (error) {
      console.error('Errore caricamento video:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      !search ||
      video.title.toLowerCase().includes(search.toLowerCase()) ||
      video.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-gray-600">Caricamento video...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-3">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">Video Lab</p>
        <h1 className="text-4xl font-bold text-secondary">Video Lab</h1>
      </div>

      {isMaestroView && (
        <Link
          href={`${basePath}/videos/new`}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Crea Video</span>
        </Link>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per titolo, descrizione..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
        />
      </div>

      {/* Videos List */}
      {filteredVideos.length === 0 ? (
        <div className="page-card p-12 text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun video trovato</h3>
          <p className="text-gray-600">
            {search ? 'Prova a modificare i filtri di ricerca' : 'Non hai ancora video assegnati'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVideos.map((video) => {
            const videoId = getYouTubeVideoId(video.video_url);
            const thumbnailUrl = videoId
              ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
              : video.thumbnail_url;
            const categoryLabel =
              categories.find((c) => c.value === video.category)?.label ?? video.category;
            const meta = [
              format(new Date(video.created_at), 'd MMM yyyy', { locale: it }),
              categoryLabel,
              video.duration_minutes ? `${video.duration_minutes} min` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <Link
                key={video.id}
                href={`${basePath}/videos/${video.id}`}
                className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                style={{ background: 'var(--color-frozen-lake-900)' }}
              >
                <div className="flex items-center gap-3 px-3 py-3.5">
                  <div className="flex h-10 aspect-video flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
                    {thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Video className="h-4 w-4 text-white/50" strokeWidth={2} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{video.title}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">{meta}</p>
                  </div>

                  {video.watched_at && (
                    <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded bg-white/20 text-white">
                      Completato
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
