'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import FeedbackThread from './FeedbackThread';
import FeedbackBanner from './FeedbackBanner';
import { segnaFeedbackLetto } from '@/lib/feedback/nonLetti';

interface FeedbackDetailData {
  id: string;
  categoria: 'suggerimento' | 'problema' | 'altro';
  titolo: string | null;
  messaggio: string;
  created_at: string;
}

const CATEGORIA_LABEL = {
  suggerimento: 'Suggerimento',
  problema: 'Problema',
  altro: 'Altro',
} as const;

export default function FeedbackDetail({ basePath }: { basePath: string }) {
  const params = useParams();
  const id = params.id as string;

  const [feedback, setFeedback] = useState<FeedbackDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/feedback/${id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setFeedback(json.feedback ?? null);
        // Aperto il dettaglio, le risposte dello staff contano come lette
        if (json.feedback) segnaFeedbackLetto(id).catch(() => {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
          href={`${basePath}/feedback`}
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
      <div className="flex-1 text-secondary font-semibold break-words">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6 pt-3">
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href={`${basePath}/feedback`} className="hover:text-secondary/80">
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
        viewer="autore"
        originale={{ messaggio: feedback.messaggio, created_at: feedback.created_at, autore: null }}
      />
    </div>
  );
}
