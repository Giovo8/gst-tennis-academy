'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { getSessionUser } from '@/lib/auth/clientSession';
import ChallengeDetailView, {
  ChallengeActionButton,
  type ArenaChallenge,
} from '@/components/arena/ChallengeDetailView';

export default function AtletaChallengePage() {
  const router = useRouter();
  const pathname = usePathname();
  // La pagina è riesportata anche nell'area maestro: i link seguono l'area corrente.
  const dashboardBase = pathname.split('/arena')[0];

  const [userId, setUserId] = useState('');

  useEffect(() => {
    void getSessionUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
    });
  }, []);

  async function respond(
    challenge: ArenaChallenge,
    status: 'accepted' | 'declined',
    reload: () => Promise<void>,
  ) {
    try {
      const response = await fetch('/api/arena/challenges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challenge.id, status }),
      });
      if (response.ok) await reload();
    } catch (error) {
      console.error('Error updating challenge:', error);
    }
  }

  async function cancelChallenge(challenge: ArenaChallenge) {
    if (!confirm('Sei sicuro di voler cancellare questa sfida?')) return;
    try {
      const response = await fetch(`/api/arena/challenges?challenge_id=${challenge.id}`, {
        method: 'DELETE',
      });
      if (response.ok) router.push(`${dashboardBase}/arena`);
    } catch (error) {
      console.error('Error cancelling challenge:', error);
    }
  }

  const configureUrl = (challenge: ArenaChallenge, otherPlayerId: string, counter = false) =>
    `${dashboardBase}/arena/configure-challenge/${otherPlayerId}?edit=${challenge.id}${
      counter ? '&counter=true' : ''
    }`;

  return (
    <ChallengeDetailView
      basePath={dashboardBase}
      arenaLabel="Arena"
      markPendingOpponent
      renderExtra={(challenge, reload) => {
        // Lo sfidante riceve la controproposta dello sfidato e la conferma o rifiuta.
        if (challenge.challenger_id !== userId || challenge.status !== 'counter_proposal') {
          return null;
        }
        return (
          <div className="page-card">
            <div className="page-card-header">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">
                Controproposta Ricevuta
              </h2>
            </div>
            <div className="px-6 py-6">
              <div className="mb-6 p-4 bg-secondary/5 border border-secondary/20 rounded-lg">
                <p className="text-sm text-secondary">
                  <strong>{challenge.opponent?.full_name}</strong> ha proposto delle modifiche alla
                  tua sfida. Rivedi i dettagli e conferma o rifiuta le modifiche.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <ChallengeActionButton
                  tone="primary"
                  onClick={() => respond(challenge, 'accepted', reload)}
                >
                  <Check className="h-5 w-5" />
                  Conferma Modifiche
                </ChallengeActionButton>
                <ChallengeActionButton
                  tone="dark"
                  onClick={() => respond(challenge, 'declined', reload)}
                >
                  <X className="h-5 w-5" />
                  Rifiuta Modifiche
                </ChallengeActionButton>
              </div>
            </div>
          </div>
        );
      }}
      renderActions={(challenge, reload) => {
        if (!userId || challenge.status !== 'pending') return null;

        // Lo sfidato risponde alla sfida in attesa.
        if (challenge.challenger_id !== userId) {
          return (
            <>
              <ChallengeActionButton
                tone="primary"
                onClick={() => respond(challenge, 'accepted', reload)}
              >
                Accetta Sfida
              </ChallengeActionButton>
              <ChallengeActionButton
                tone="outline"
                onClick={() => router.push(configureUrl(challenge, challenge.challenger_id, true))}
              >
                Proponi Modifiche
              </ChallengeActionButton>
              <ChallengeActionButton
                tone="dark"
                onClick={() => respond(challenge, 'declined', reload)}
              >
                Rifiuta Sfida
              </ChallengeActionButton>
            </>
          );
        }

        // Lo sfidante può ancora modificarla o annullarla.
        return (
          <>
            <ChallengeActionButton
              tone="primary"
              onClick={() => router.push(configureUrl(challenge, challenge.opponent_id))}
            >
              Modifica Sfida
            </ChallengeActionButton>
            <ChallengeActionButton tone="muted" onClick={() => cancelChallenge(challenge)}>
              Annulla Sfida
            </ChallengeActionButton>
          </>
        );
      }}
    />
  );
}
