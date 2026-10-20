'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import AvvisoForm, { type AvvisoFormValues } from '@/components/avvisi/AvvisoForm';
import type { AvvisoTipo } from '@/lib/avvisi/tipi';

function EditAvvisoContent() {
  const router = useRouter();
  const id = useSearchParams().get('id');
  const [initialValues, setInitialValues] = useState<AvvisoFormValues | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/avvisi/${id}`);
      if (cancelled) return;
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const { avviso } = await res.json();
      if (cancelled) return;
      setInitialValues({
        tipo: (avviso.tipo as AvvisoTipo) ?? 'generale',
        testo: avviso.testo ?? '',
        messaggio: avviso.messaggio ?? '',
        visibile_fino: avviso.visibile_fino ?? '',
        link: avviso.link ?? '',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(values: AvvisoFormValues) {
    const res = await fetch(`/api/admin/avvisi/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || 'Modifica non riuscita');
      return;
    }
    toast.success('Avviso aggiornato');
    router.push(`/dashboard/admin/avvisi/${id}`);
  }

  if (!id || notFound) {
    return (
      <div className="bg-white rounded-lg border border-black/10 py-8 text-center text-sm font-medium text-secondary/40">
        Avviso non trovato
      </div>
    );
  }

  if (!initialValues) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento avviso...</p>
      </div>
    );
  }

  return (
    <AvvisoForm
      initialValues={initialValues}
      submitLabel="Salva Modifiche"
      submittingLabel="Salvataggio..."
      onSubmit={handleSubmit}
    />
  );
}

export default function EditAvvisoPage() {
  return (
    <div className="space-y-6 pt-3">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-secondary" />
          </div>
        }
      >
        <EditAvvisoContent />
      </Suspense>
      <div className="h-8" />
    </div>
  );
}
