'use client';

import React, { useState } from 'react';
import { Trophy, Users, Target } from 'lucide-react';

type TournamentType = 'eliminazione_diretta' | 'girone_eliminazione' | 'campionato';

interface TournamentFormData {
  title: string;
  description: string;
  start_date?: string;
  end_date?: string;
  tournament_type: TournamentType;
  max_participants: number;
  num_groups: number;
  teams_per_group: number;
  teams_advancing: number;
  category: string;
  surface_type: string;
  match_format: string;
  entry_fee: string;
  extras: string[];
}

interface SimpleTournamentCreatorProps {
  onSuccess?: () => void;
}

export default function SimpleTournamentCreator({ onSuccess }: SimpleTournamentCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<TournamentFormData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    tournament_type: 'eliminazione_diretta',
    max_participants: 16,
    num_groups: 4,
    teams_per_group: 4,
    teams_advancing: 2,
    category: 'Open',
    surface_type: 'terra',
    match_format: 'best_of_3',
    entry_fee: '',
    extras: []
  });

  const tournamentTypes = [
    {
      id: 'eliminazione_diretta' as TournamentType,
      name: 'Torneo ad Eliminazione Diretta',
      description: 'Tabellone classico: chi perde è eliminato',
      icon: Trophy,
      color: 'from-red-500 to-pink-500',
      recommended: 'Ideale per: tornei veloci, eventi singoli'
    },
    {
      id: 'girone_eliminazione' as TournamentType,
      name: 'Girone + Eliminazione',
      description: 'Prima fase a gironi, poi tabellone finale',
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      recommended: 'Ideale per: tornei medi con più garanzie di gioco'
    },
    {
      id: 'campionato' as TournamentType,
      name: 'Campionato (Tutti contro tutti)',
      description: 'Ogni partecipante gioca contro tutti gli altri',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      recommended: 'Ideale per: stagioni lunghe, leghe'
    }
  ];

  const eliminationSizes = [4, 8, 16, 32, 64];

  const selectedTournamentType = tournamentTypes.find(
    (t) => t.id === formData.tournament_type
  );

  const handleTypeSelect = (type: TournamentType) => {
    setFormData(prev => {
      const updated = { ...prev, tournament_type: type };

      if (type === 'eliminazione_diretta') {
        updated.max_participants = 16;
      } else if (type === 'girone_eliminazione') {
        updated.num_groups = 4;
        updated.teams_per_group = 4;
        updated.teams_advancing = 2;
        updated.max_participants = 16;
      } else if (type === 'campionato') {
        updated.max_participants = 12;
      }

      return updated;
    });
  };

  const handleParticipantsChange = (value: number) => {
    setFormData(prev => ({ ...prev, max_participants: value }));
  };

  const handleGroupConfigChange = (
    field: 'num_groups' | 'teams_per_group' | 'teams_advancing',
    value: number
  ) => {
    setFormData(prev => {
      const updated: TournamentFormData = { ...prev, [field]: value } as TournamentFormData;

      if (field === 'num_groups' || field === 'teams_per_group') {
        updated.max_participants =
          (field === 'num_groups' ? value : updated.num_groups) *
          (field === 'teams_per_group' ? value : updated.teams_per_group);
      }

      return updated;
    });
  };

  const toggleExtra = (value: string) => {
    setFormData(prev => {
      const exists = prev.extras.includes(value);
      return {
        ...prev,
        extras: exists
          ? prev.extras.filter((e) => e !== value)
          : [...prev.extras, value],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Sessione non valida. Effettua nuovamente il login.');
        setLoading(false);
        return;
      }

      const payload: any = {
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        end_date: formData.end_date || undefined,
        tournament_type: formData.tournament_type,
        max_participants: formData.max_participants,
        category: formData.category,
        surface_type: formData.surface_type,
        match_format: formData.match_format,
        entry_fee: formData.entry_fee ? Number(formData.entry_fee) : undefined,
      };

      if (formData.tournament_type === 'girone_eliminazione') {
        payload.num_groups = formData.num_groups;
        payload.teams_per_group = formData.teams_per_group;
        payload.teams_advancing = formData.teams_advancing;
      }

      const response = await fetch('/api/tournaments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella creazione del torneo');
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Errore nella creazione del torneo');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
          <Trophy className="h-8 w-8 text-secondary" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-secondary">Torneo creato!</h3>
        <p className="text-sm text-secondary/70">Il tuo torneo è stato creato con successo.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 p-4 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Sezione 1: Tipo di competizione */}
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-secondary">Tipo di competizione</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {tournamentTypes.map((type) => {
            const isSelected = formData.tournament_type === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleTypeSelect(type.id)}
                className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                  isSelected
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-white text-secondary/80 border border-gray-200 hover:border-secondary/40 hover:bg-secondary/5'
                }`}
              >
                <span className="text-left whitespace-nowrap md:whitespace-normal">
                  {type.name}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Sezione 2: Configurazione in base al tipo */}
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-secondary">Configura Competizione</h3>
        </div>

        {formData.tournament_type === 'eliminazione_diretta' && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-secondary mb-2 block">
                Numero di Partecipanti
              </span>
              <div className="grid grid-cols-5 gap-2">
                {eliminationSizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleParticipantsChange(size)}
                    className={`rounded-lg border py-3 font-semibold transition-all ${
                      formData.max_participants === size
                        ? 'border-secondary bg-secondary text-white'
                        : 'border border-gray-200 bg-white text-secondary hover:border-secondary/40'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </label>
          </div>
        )}

        {formData.tournament_type === 'girone_eliminazione' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <label className="block">
                <span className="text-sm font-medium text-secondary mb-2 block">
                  Numero Gironi
                </span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={formData.num_groups}
                  onChange={(e) => handleGroupConfigChange('num_groups', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-secondary"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-secondary mb-2 block">
                  Squadre per Girone
                </span>
                <input
                  type="number"
                  min="3"
                  max="8"
                  value={formData.teams_per_group}
                  onChange={(e) => handleGroupConfigChange('teams_per_group', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-secondary"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-secondary mb-2 block">
                  Qualificati per Girone
                </span>
                <input
                  type="number"
                  min="1"
                  max={formData.teams_per_group - 1}
                  value={formData.teams_advancing}
                  onChange={(e) => handleGroupConfigChange('teams_advancing', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-secondary"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-secondary mb-2 block">
                  Partecipanti totali
                </span>
                <input
                  type="number"
                  value={formData.max_participants}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-secondary"
                />
              </label>
            </div>
          </div>
        )}

        {formData.tournament_type === 'campionato' && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-secondary mb-2 block">
                Numero di Partecipanti
              </span>
              <input
                type="number"
                min="3"
                max="30"
                value={formData.max_participants}
                onChange={(e) => handleParticipantsChange(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-secondary"
              />
            </label>
          </div>
        )}
      </div>

      {/* Sezione 3: Dettagli torneo */}
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-secondary">Dettagli Competizione</h3>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-secondary mb-2 block">
              Nome Torneo *
            </span>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Es: Torneo Open Estivo 2025"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-secondary mb-2 block">
              Descrizione
            </span>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrivi il torneo..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-secondary mb-2 block">
                Data Inizio (opzionale)
              </span>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-secondary mb-2 block">
                Data Fine (opzionale)
              </span>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-secondary mb-2 block">
                Categoria
              </span>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              >
                <option value="Open">Open</option>
                <option value="Under 18">Under 18</option>
                <option value="Under 16">Under 16</option>
                <option value="Under 14">Under 14</option>
                <option value="Veterani">Veterani</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-secondary mb-2 block">
                Formato Partita
              </span>
              <select
                value={formData.match_format}
                onChange={(e) => setFormData(prev => ({ ...prev, match_format: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-secondary"
              >
                <option value="best_of_3">Al meglio di 3 set</option>
                <option value="best_of_5">Al meglio di 5 set</option>
                <option value="best_of_1">1 set unico</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-secondary mb-2 block">
                Extra
              </span>
              <div className="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <label className="inline-flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={formData.extras.includes('killer_point')}
                    onChange={() => toggleExtra('killer_point')}
                    className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary/40"
                  />
                  <span>Killer point</span>
                </label>
              </div>
            </label>
          </div>

          {/* Campo quota iscrizione rimosso dall'interfaccia */}
        </div>
      </div>

      <div className="mt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-3 font-semibold text-white hover:bg-secondary/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creazione...
            </>
          ) : (
            <>
              <Trophy className="h-4 w-4" />
              Crea Torneo
            </>
          )}
        </button>
      </div>
    </form>
  );
}
