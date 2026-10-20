'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AvvisoForm, { type AvvisoFormValues } from '@/components/avvisi/AvvisoForm';

export default function NewAvvisoPage() {
  const router = useRouter();

  async function handleSubmit(values: AvvisoFormValues) {
    const res = await fetch('/api/admin/avvisi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || 'Invio non riuscito');
      return;
    }
    toast.success('Avviso pubblicato');
    router.push('/dashboard/admin/avvisi');
  }

  return (
    <div className="space-y-6 pt-3">
      <AvvisoForm
        submitLabel="Pubblica Avviso"
        submittingLabel="Pubblicazione..."
        onSubmit={handleSubmit}
      />
      <div className="h-8" />
    </div>
  );
}
