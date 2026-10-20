'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { toastError } from '@/lib/toast';
import FeedbackThread from '@/components/feedback/FeedbackThread';
import FeedbackBanner from '@/components/feedback/FeedbackBanner';
import { segnaFeedbackLetto } from '@/lib/feedback/nonLetti';

interface FeedbackDetail {
  id: string;
  categoria: 'suggerimento' | 'problema' | 'altro';
  titolo: string | null;
  messaggio: string;
  stato: 'nuovo' | 'letto' | 'archiviato';
  created_at: string;
  profile: { full_name: string | null; email: string | null; role: string | null } | null;
}

const CATEGORIA_LABEL = {
  suggerimento: 'Suggerimento',
  problema: 'Problema',
  altro: 'Altro',
} as const;

export default function AdminFeedbackDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/feedback/${id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setFeedback(json.feedback ?? null);
        // Notifiche "nuovo feedback"/risposte di questo thread: lette, il puntino in nav bar si aggiorna
        void segnaFeedbackLetto(id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const setStato = async (stato: 'letto' | 'archiviato') => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toastError(json.error, 'Operazione non riuscita');
        return;
      }
      setFeedback((prev) => (prev ? { ...prev, stato } : prev));
      toast.success(stato === 'archiviato' ? 'Feedback archiviato' : 'Feedback ripristinato');
    } catch (error) {
      toastError(error, 'Operazione non riuscita');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (
      !confirm('Sei sicuro di voler eliminare questo feedback?\n\nQuesta azione è irreversibile.')
    )
      return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toastError(json.error, 'Eliminazione non riuscita');
        return;
      }
      toast.success('Feedback eliminato');
      router.push('/dashboard/admin/feedback');
    } catch (error) {
      toastError(error, 'Eliminazione non riuscita');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="space-y-6 pt-3">
        <Link
          href="/dashboard/admin/feedback"
          className="text-xs font-semibold text-secondary/60 uppercase tracking-wider hover:text-secondary/80"
        >
          ‹ Feedback
        </Link>
        <div className="bg-white rounded-lg p-12 text-center">
          <p className="text-secondary/70">Feedback non trovato</p>
        </div>
      </div>
    );
  }

  const row = (label: string, value: React.ReactNode, last = false) => (
    <div
      className={`flex flex-col md:flex-row md:items-start gap-3 md:gap-8 ${
        last ? '' : 'pb-6 border-b border-gray-200'
      }`}
    >
      <span className="w-full md:w-48 text-sm text-secondary font-medium flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 text-secondary font-semibold">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6 pt-3">
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/admin/feedback" className="hover:text-secondary/80">
            Feedback
          </Link>
          {' › '}
          <span>Dettaglio Feedback</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Dettaglio Feedback</h1>
      </div>

      <FeedbackBanner categoria={feedback.categoria} titolo={feedback.titolo} />

      <div className="page-card">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni</h2>
        </div>
        <div className="p-6 space-y-6">
          {row('Autore', feedback.profile?.full_name || 'Utente')}
          {row(
            'Email',
            feedback.profile?.email ? (
              <a href={`mailto:${feedback.profile.email}`} className="hover:text-secondary/70">
                {feedback.profile.email}
              </a>
            ) : (
              '—'
            ),
          )}
          {row('Categoria', CATEGORIA_LABEL[feedback.categoria])}
          {row(
            'Data',
            new Date(feedback.created_at).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            true,
          )}
        </div>
      </div>

      <FeedbackThread
        feedbackId={feedback.id}
        viewer="admin"
        originale={{
          messaggio: feedback.messaggio,
          created_at: feedback.created_at,
          autore: feedback.profile?.full_name ?? null,
        }}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        {feedback.stato === 'archiviato' ? (
          <button
            onClick={() => setStato('letto')}
            disabled={busy}
            className="w-full flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50"
          >
            Ripristina
          </button>
        ) : (
          <button
            onClick={() => setStato('archiviato')}
            disabled={busy}
            className="w-full flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium disabled:opacity-50"
          >
            Archivia
          </button>
        )}
        <button
          onClick={remove}
          disabled={busy}
          className="w-full flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Elimina'}
        </button>
      </div>
    </div>
  );
}
