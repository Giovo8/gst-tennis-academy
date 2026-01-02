'use client';

import React, { useState } from 'react';
import { Trophy, Users, Target, Calendar } from 'lucide-react';

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
}

interface SimpleTournamentCreatorProps {
  onSuccess?: () => void;
}

export default function SimpleTournamentCreator({ onSuccess }: SimpleTournamentCreatorProps) {
  const [step, setStep] = useState(1);
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
    entry_fee: ''
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

  const handleTypeSelect = (type: TournamentType) => {
    setFormData(prev => {
      const updated = { ...prev, tournament_type: type };
      
      // Imposta valori di default in base al tipo
      if (type === 'eliminazione_diretta') {
        updated.max_participants = 16;
      } else if (type === 'girone_eliminazione') {
        updated.num_groups = 4;
        updated.teams_per_group = 4;
        updated.teams_advancing = 2;
        updated.max_participants = 16; // 4 gironi x 4 squadre
      } else if (type === 'campionato') {
        updated.max_participants = 12;
      }
      
      return updated;
    });
    setStep(2);
  };

  const handleParticipantsChange = (value: number) => {
    setFormData(prev => ({ ...prev, max_participants: value }));
  };

  const handleGroupConfigChange = (field: 'num_groups' | 'teams_per_group' | 'teams_advancing', value: number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Ricalcola max_participants per gironi
      if (field === 'num_groups' || field === 'teams_per_group') {
        updated.max_participants = (field === 'num_groups' ? value : updated.num_groups) * 
                                   (field === 'teams_per_group' ? value : updated.teams_per_group);
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Ottieni il token di sessione
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
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
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
      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
          <Trophy className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">Torneo Creato!</h3>
        <p className="text-sm text-muted">Il tuo torneo è stato creato con successo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicatore di progresso */}
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              step >= s 
                ? 'border-accent bg-accent text-white' 
                : 'border-border bg-surface text-muted'
            } font-semibold`}>
              {s}
            </div>
            {s < 3 && (
              <div className={`mx-2 h-0.5 w-12 ${
                step > s ? 'bg-accent' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Step 1: Scegli tipo torneo */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Che tipo di torneo vuoi creare?</h3>
            <p className="text-sm text-muted">Scegli la struttura più adatta alle tue esigenze</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {tournamentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 text-left transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/20"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 transition-opacity group-hover:opacity-10`} />
                  
                  <div className="relative space-y-3">
                    <div className={`inline-flex rounded-lg bg-gradient-to-br ${type.color} p-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    
                    <h4 className="font-semibold text-white">{type.name}</h4>
                    <p className="text-sm text-muted">{type.description}</p>
                    
                    <div className="pt-2 text-xs text-muted-2">
                      {type.recommended}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Configurazione */}
      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-6">
          <div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-4 text-sm text-accent hover:underline"
            >
              ← Cambia tipo di torneo
            </button>
            <h3 className="text-xl font-semibold text-white mb-2">Configura il torneo</h3>
            <p className="text-sm text-muted">
              Tipo selezionato: <span className="text-accent font-semibold">
                {tournamentTypes.find(t => t.id === formData.tournament_type)?.name}
              </span>
            </p>
          </div>

          {/* Configurazione Eliminazione Diretta */}
          {formData.tournament_type === 'eliminazione_diretta' && (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-white mb-2 block">
                  Numero di Partecipanti
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {eliminationSizes.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleParticipantsChange(size)}
                      className={`rounded-lg border-2 py-3 font-semibold transition-all ${
                        formData.max_participants === size
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border bg-surface-lighter text-muted hover:border-accent/50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-2">
                  Per eliminazione diretta, il numero deve essere una potenza di 2
                </p>
              </label>
            </div>
          )}

          {/* Configurazione Girone + Eliminazione */}
          {formData.tournament_type === 'girone_eliminazione' && (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-white mb-2 block">
                    Numero Gironi
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={formData.num_groups}
                    onChange={(e) => handleGroupConfigChange('num_groups', Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-white mb-2 block">
                    Squadre per Girone
                  </span>
                  <input
                    type="number"
                    min="3"
                    max="8"
                    value={formData.teams_per_group}
                    onChange={(e) => handleGroupConfigChange('teams_per_group', Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-white mb-2 block">
                    Qualificati per Girone
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={formData.teams_per_group - 1}
                    value={formData.teams_advancing}
                    onChange={(e) => handleGroupConfigChange('teams_advancing', Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                  />
                </label>
              </div>

              <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
                <p className="text-sm text-white">
                  <strong>Riepilogo:</strong> {formData.num_groups} gironi da {formData.teams_per_group} squadre = <strong className="text-accent">{formData.max_participants} partecipanti totali</strong>
                </p>
                <p className="mt-1 text-xs text-muted">
                  Qualificati alla fase eliminazione: {formData.num_groups * formData.teams_advancing} squadre
                </p>
              </div>
            </div>
          )}

          {/* Configurazione Campionato */}
          {formData.tournament_type === 'campionato' && (
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-white mb-2 block">
                  Numero di Partecipanti
                </span>
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={formData.max_participants}
                  onChange={(e) => handleParticipantsChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                />
                <p className="mt-2 text-xs text-muted-2">
                  Ogni partecipante giocherà {formData.max_participants - 1} partite (tutti contro tutti)
                </p>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-border bg-surface px-6 py-2 text-white hover:bg-surface-lighter"
            >
              Indietro
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-6 py-2 font-semibold text-white hover:bg-accent/90"
            >
              Continua
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Dettagli torneo */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mb-4 text-sm text-accent hover:underline"
            >
              ← Indietro
            </button>
            <h3 className="text-xl font-semibold text-white mb-2">Dettagli del torneo</h3>
            <p className="text-sm text-muted">Completa le informazioni generali</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-white mb-2 block">
                Nome Torneo *
              </span>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Es: Torneo Open Estivo 2025"
                className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white placeholder:text-muted"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-white mb-2 block">
                Descrizione
              </span>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrivi il torneo..."
                className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white placeholder:text-muted"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-white mb-2 block">
                  Data Inizio (opzionale)
                </span>
                <input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-white mb-2 block">
                  Data Fine (opzionale)
                </span>
                <input
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-white mb-2 block">
                  Categoria
                </span>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                >
                  <option value="Open">Open</option>
                  <option value="Under 18">Under 18</option>
                  <option value="Under 16">Under 16</option>
                  <option value="Under 14">Under 14</option>
                  <option value="Veterani">Veterani</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-white mb-2 block">
                  Superficie
                </span>
                <select
                  value={formData.surface_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, surface_type: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                >
                  <option value="terra">Terra Battuta</option>
                  <option value="cemento">Cemento</option>
                  <option value="erba">Erba</option>
                  <option value="sintetico">Sintetico</option>
                  <option value="indoor">Indoor</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-white mb-2 block">
                  Formato Partita
                </span>
                <select
                  value={formData.match_format}
                  onChange={(e) => setFormData(prev => ({ ...prev, match_format: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white"
                >
                  <option value="best_of_3">Al meglio di 3 set</option>
                  <option value="best_of_5">Al meglio di 5 set</option>
                  <option value="best_of_1">1 set unico</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-white mb-2 block">
                Quota d'Iscrizione (€)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.entry_fee}
                onChange={(e) => setFormData(prev => ({ ...prev, entry_fee: e.target.value }))}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-surface-lighter px-4 py-2 text-white placeholder:text-muted"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={loading}
              className="rounded-lg border border-border bg-surface px-6 py-2 text-white hover:bg-surface-lighter disabled:opacity-50"
            >
              Indietro
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2 font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
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
      )}
    </div>
  );
}
