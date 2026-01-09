"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, Target, Loader2, AlertCircle, CheckCircle } from "lucide-react";

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

export default function NewTournamentPage() {
  const router = useRouter();
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
    { id: 'eliminazione_diretta' as TournamentType, name: 'Eliminazione Diretta' },
    { id: 'girone_eliminazione' as TournamentType, name: 'Girone + Eliminazione' },
    { id: 'campionato' as TournamentType, name: 'Campionato' }
  ];

  const eliminationSizes = [4, 8, 16, 32, 64];

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
        extras: exists ? prev.extras.filter((e) => e !== value) : [...prev.extras, value],
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
        router.push('/dashboard/admin/tornei');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Errore nella creazione del torneo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            <Link
              href="/dashboard/admin/tornei"
              className="hover:text-secondary/80 transition-colors"
            >
              Gestione Competizioni
            </Link>
            <span className="mx-2">›</span>
            <span>Nuovo Torneo</span>
          </div>
          <h1 className="text-3xl font-bold text-secondary">Crea nuovo torneo</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Configura e crea un nuovo torneo o campionato per la GST Tennis Academy
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Successo</p>
            <p className="text-sm text-green-700 mt-1">Torneo creato con successo!</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl p-6 space-y-6">
          {/* Tipo competizione */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Tipo competizione *
            </label>
            <div className="flex-1 flex gap-3 flex-wrap">
              {tournamentTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeSelect(type.id)}
                  className={`px-5 py-2 text-sm rounded-lg border transition-all ${
                    formData.tournament_type === type.id
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* Numero partecipanti - Eliminazione Diretta */}
          {formData.tournament_type === 'eliminazione_diretta' && (
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Numero partecipanti *
              </label>
              <div className="flex-1 flex gap-3 flex-wrap">
                {eliminationSizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleParticipantsChange(size)}
                    className={`px-5 py-2 text-sm rounded-lg border transition-all min-w-[60px] ${
                      formData.max_participants === size
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Configurazione Gironi */}
          {formData.tournament_type === 'girone_eliminazione' && (
            <>
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Numero gironi *
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={formData.num_groups}
                    onChange={(e) => handleGroupConfigChange('num_groups', Number(e.target.value))}
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
                  />
                </div>
              </div>

              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Squadre per girone *
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    min="3"
                    max="8"
                    value={formData.teams_per_group}
                    onChange={(e) => handleGroupConfigChange('teams_per_group', Number(e.target.value))}
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
                  />
                </div>
              </div>

              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Qualificati per girone *
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max={formData.teams_per_group - 1}
                    value={formData.teams_advancing}
                    onChange={(e) => handleGroupConfigChange('teams_advancing', Number(e.target.value))}
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
                  />
                </div>
              </div>

              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Partecipanti totali
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    value={formData.max_participants}
                    readOnly
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary"
                  />
                </div>
              </div>
            </>
          )}

          {/* Numero partecipanti - Campionato */}
          {formData.tournament_type === 'campionato' && (
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Numero partecipanti *
              </label>
              <div className="flex-1">
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={formData.max_participants}
                  onChange={(e) => handleParticipantsChange(Number(e.target.value))}
                  className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
                />
              </div>
            </div>
          )}

          {/* Nome torneo */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Nome torneo *
            </label>
            <div className="flex-1">
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Es: Torneo Open Estivo 2025"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
              />
            </div>
          </div>

          {/* Descrizione */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Descrizione
            </label>
            <div className="flex-1">
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrivi il torneo..."
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
              />
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Date
            </label>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-secondary/60 mb-1.5 block">Data inizio</label>
                <input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
                />
              </div>
              <div>
                <label className="text-xs text-secondary/60 mb-1.5 block">Data fine</label>
                <input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
                />
              </div>
            </div>
          </div>

          {/* Categoria */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Categoria
            </label>
            <div className="flex-1">
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
              >
                <option value="Open">Open</option>
                <option value="Under 18">Under 18</option>
                <option value="Under 16">Under 16</option>
                <option value="Under 14">Under 14</option>
                <option value="Veterani">Veterani</option>
              </select>
            </div>
          </div>

          {/* Formato partita */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Formato partita
            </label>
            <div className="flex-1">
              <select
                value={formData.match_format}
                onChange={(e) => setFormData(prev => ({ ...prev, match_format: e.target.value }))}
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/50"
              >
                <option value="best_of_3">Al meglio di 3 set</option>
                <option value="best_of_5">Al meglio di 5 set</option>
                <option value="best_of_1">1 set unico</option>
              </select>
            </div>
          </div>

          {/* Extra */}
          <div className="flex items-start gap-8">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Extra
            </label>
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 text-sm text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.extras.includes('killer_point')}
                  onChange={() => toggleExtra('killer_point')}
                  className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary/40"
                />
                <span>Killer point</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 text-white bg-secondary hover:opacity-90 disabled:opacity-50 font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Creazione in corso...</span>
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4" />
                <span>Crea Torneo</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
