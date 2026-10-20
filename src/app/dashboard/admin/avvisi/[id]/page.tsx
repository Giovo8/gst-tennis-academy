'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { avvisoTipoUi, formatDataAvviso, oggiRoma } from '@/lib/avvisi/tipi';

interface Avviso {
  id: string;
  tipo: string;
  testo: string;
  messaggio: string | null;
  visibile_fino: string | null;
  link: string | null;
  attivo: boolean;
  created_at: string;
}

const sectionClassName = 'bg-white rounded-lg border border-black/10 overflow-hidden';
const sectionHeaderClassName = 'px-6 py-4 border-b border-black/10 bg-gray-50';
const rowClassName =
  'flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200 last:border-b-0 last:pb-0';
const labelClassName = 'sm:w-48 text-sm text-secondary font-medium flex-shrink-0';
const actionClassName =
  'flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed';

export default function AdminAvvisoDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [avviso, setAvviso] = useState<Avviso | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'toggle' | 'delete' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/avvisi/${id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setAvviso(json.avviso);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleAttivo() {
    if (!avviso) return;
    setAction('toggle');
    try {
      const res = await fetch(`/api/admin/avvisi/${avviso.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attivo: !avviso.attivo }),
      });
      if (!res.ok) {
        toast.error('Modifica non riuscita');
        return;
      }
      setAvviso({ ...avviso, attivo: !avviso.attivo });
      toast.success(avviso.attivo ? 'Avviso disattivato' : 'Avviso riattivato');
    } finally {
      setAction(null);
    }
  }

  async function remove() {
    if (!avviso || !confirm('Eliminare questo avviso?')) return;
    setAction('delete');
    try {
      const res = await fetch(`/api/admin/avvisi/${avviso.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Eliminazione non riuscita');
        return;
      }
      toast.success('Avviso eliminato');
      router.push('/dashboard/admin/avvisi');
    } finally {
      setAction(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento avviso...</p>
      </div>
    );
  }

  if (!avviso) {
    return (
      <div className="pt-3">
        <div className="bg-white rounded-lg border border-black/10 py-8 text-center text-sm font-medium text-secondary/40">
          Avviso non trovato
        </div>
      </div>
    );
  }

  const ui = avvisoTipoUi(avviso.tipo);
  const Icon = ui.icon;
  const scaduto = !!avviso.visibile_fino && avviso.visibile_fino < oggiRoma();
  const stato = !avviso.attivo ? 'Disattivato' : scaduto ? 'Scaduto' : 'Visibile in Bacheca';

  return (
    <div className="space-y-6 pt-3">
      <div
        className="rounded-lg border border-black/10 p-6 overflow-hidden"
        style={{ backgroundColor: ui.bg }}
      >
        <div className="flex items-start gap-6">
          <Icon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white break-words">{avviso.testo}</h2>
          </div>
        </div>
      </div>

      <div className={sectionClassName}>
        <div className={sectionHeaderClassName}>
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli avviso</h2>
        </div>
        <div className="px-6 py-6 space-y-6">
          <div className={rowClassName}>
            <span className={labelClassName}>Tipo</span>
            <p className="flex-1 text-secondary font-semibold">{ui.label}</p>
          </div>
          <div className={rowClassName}>
            <span className={labelClassName}>Pubblicato il</span>
            <p className="flex-1 text-secondary font-semibold">
              {formatDataAvviso(avviso.created_at)}
            </p>
          </div>
          <div className={rowClassName}>
            <span className={labelClassName}>Stato</span>
            <p className="flex-1 text-secondary font-semibold">{stato}</p>
          </div>
          <div className={rowClassName}>
            <span className={labelClassName}>Visibile fino al</span>
            <p className="flex-1 text-secondary font-semibold">
              {avviso.visibile_fino
                ? formatDataAvviso(`${avviso.visibile_fino}T12:00:00`)
                : 'Nessuna scadenza'}
            </p>
          </div>
          <div className={rowClassName}>
            <span className={labelClassName}>Link</span>
            {avviso.link ? (
              <Link
                href={avviso.link}
                className="flex-1 text-secondary font-semibold underline break-all"
              >
                {avviso.link}
              </Link>
            ) : (
              <p className="flex-1 text-secondary/50">Nessun link</p>
            )}
          </div>
        </div>
      </div>

      {avviso.messaggio && (
        <div className={sectionClassName}>
          <div className={sectionHeaderClassName}>
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Testo</h2>
          </div>
          <div className="px-6 py-4">
            <p className="text-secondary/70 whitespace-pre-line break-words">{avviso.messaggio}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/dashboard/admin/avvisi/modifica?id=${avviso.id}`}
          className={`${actionClassName} bg-secondary hover:bg-secondary/90`}
        >
          Modifica
        </Link>
        <button
          onClick={toggleAttivo}
          disabled={action !== null}
          className={`${actionClassName} bg-[#023b52] hover:bg-[#023b52]/90`}
        >
          {action === 'toggle' && <Loader2 className="h-5 w-5 animate-spin" />}
          {avviso.attivo ? 'Disattiva' : 'Riattiva'}
        </button>
        <button
          onClick={remove}
          disabled={action !== null}
          className={`${actionClassName} bg-[#022431] hover:bg-[#022431]/90`}
        >
          {action === 'delete' && <Loader2 className="h-5 w-5 animate-spin" />}
          Elimina
        </button>
      </div>
    </div>
  );
}
