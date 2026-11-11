'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { toastError } from '@/lib/toast';
import ChallengeDetailView, {
  ChallengeActionButton,
  type ArenaChallenge,
} from '@/components/arena/ChallengeDetailView';

/** PATCH dello stato di una sfida; in caso di errore mostra il toast e restituisce false. */
async function updateChallengeStatus(challengeId: string, status: string, errorMessage: string) {
  try {
    const response = await fetch('/api/arena/challenges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge_id: challengeId, status }),
    });
    if (response.ok) return true;

    const errorData = await response.json().catch(() => null);
    toastError(errorData?.error, errorMessage);
  } catch (error) {
    console.error('Error updating challenge:', error);
    toast.error(errorMessage);
  }
  return false;
}

export default function AdminChallengeDetailPage() {
  const router = useRouter();

  async function handleDelete(challenge: ArenaChallenge) {
    if (!confirm('Sei sicuro di voler eliminare questa sfida?')) return;

    try {
      const response = await fetch(`/api/arena/challenges?challenge_id=${challenge.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (challenge.booking_id) {
          await supabase.from('bookings').delete().eq('id', challenge.booking_id);
        }
        router.push('/dashboard/admin/arena');
        return;
      }

      const errorData = await response.json().catch(() => null);
      toastError(errorData?.error, 'Eliminazione non riuscita');
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast.error('Eliminazione non riuscita');
    }
  }

  async function handleCancel(challenge: ArenaChallenge, reload: () => Promise<void>) {
    if (!confirm('Sei sicuro di voler annullare questa sfida?')) return;

    if (!(await updateChallengeStatus(challenge.id, 'cancelled', 'Annullamento non riuscito'))) {
      return;
    }
    if (challenge.booking_id) {
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', challenge.booking_id);
    }
    await reload();
  }

  async function handleConfirm(challenge: ArenaChallenge, reload: () => Promise<void>) {
    if (!confirm('Confermare questa sfida?')) return;

    if (await updateChallengeStatus(challenge.id, 'accepted', 'Conferma non riuscita')) {
      await reload();
    }
  }

  return (
    <ChallengeDetailView
      basePath="/dashboard/admin"
      arenaLabel="Gestione Arena"
      renderActions={(challenge, reload) => {
        const isClosed =
          challenge.status === 'cancelled' ||
          challenge.status === 'completed' ||
          challenge.status === 'awaiting_score';

        return (
          <>
            {challenge.status === 'pending' && (
              <ChallengeActionButton tone="accent" onClick={() => handleConfirm(challenge, reload)}>
                Conferma
              </ChallengeActionButton>
            )}
            {!isClosed && (
              <ChallengeActionButton
                tone="primary"
                onClick={() => router.push(`/dashboard/admin/arena/challenge/${challenge.id}/edit`)}
              >
                Modifica
              </ChallengeActionButton>
            )}
            {!isClosed && challenge.status !== 'declined' && (
              <ChallengeActionButton tone="muted" onClick={() => handleCancel(challenge, reload)}>
                Annulla
              </ChallengeActionButton>
            )}
            <ChallengeActionButton tone="dark" onClick={() => handleDelete(challenge)}>
              Elimina
            </ChallengeActionButton>
          </>
        );
      }}
    />
  );
}
