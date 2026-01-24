'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Search, X, Loader2, Check } from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';

interface ManualEnrollmentProps {
  tournamentId: string;
  currentParticipants: number;
  maxParticipants: number;
  onEnrollmentSuccess: () => void;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export default function ManualEnrollment({ 
  tournamentId, 
  currentParticipants, 
  maxParticipants,
  onEnrollmentSuccess 
}: ManualEnrollmentProps) {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (showModal) {
      loadUsers();
      setSelectedUserIds(new Set());
      setSearchQuery('');
    }
  }, [showModal]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(user => 
          user.full_name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        setLoading(false);
        return;
      }

      // Carica solo gli atleti tramite API
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Errore nel caricamento');
      }

      const data = await res.json();
      // Filtra solo gli utenti con ruolo "atleta"
      const athletes = (data.users || []).filter((user: User) => user.role === 'atleta');
      setUsers(athletes);
      setFilteredUsers(athletes);
    } catch (error: any) {
      console.error('Error loading users:', error);
      alert(error.message || 'Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      // Verifica che non si superi il limite
      if (currentParticipants + newSelection.size >= maxParticipants) {
        alert('Numero massimo di partecipanti raggiunto');
        return;
      }
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleEnrollSelected = async () => {
    if (selectedUserIds.size === 0) {
      alert('Seleziona almeno un atleta');
      return;
    }

    if (currentParticipants + selectedUserIds.size > maxParticipants) {
      alert('Numero massimo di partecipanti superato');
      return;
    }

    setEnrolling(true);

    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      // Iscrivi tutti gli atleti selezionati
      const enrollmentPromises = Array.from(selectedUserIds).map(userId =>
        fetch('/api/tournament_participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            tournament_id: tournamentId,
            user_id: userId
          })
        })
      );

      const results = await Promise.all(enrollmentPromises);
      const failedEnrollments = results.filter(res => !res.ok);

      if (failedEnrollments.length === 0) {
        alert(`${selectedUserIds.size} atleta/i iscritto/i con successo!`);
        setShowModal(false);
        setSelectedUserIds(new Set());
        onEnrollmentSuccess();
      } else {
        alert(`${results.length - failedEnrollments.length} atleti iscritti, ${failedEnrollments.length} errori`);
        onEnrollmentSuccess();
      }
    } catch (error) {
      console.error('Error enrolling users:', error);
      alert('Errore nell\'iscrizione');
    } finally {
      setEnrolling(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowModal(false);
          setSelectedUserIds(new Set());
          setSearchQuery('');
        }
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-secondary rounded-t-xl">
              <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6 text-white" />
                <h3 className="text-lg font-bold text-white">Iscrivi Atleti al Torneo</h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUserIds(new Set());
                  setSearchQuery('');
                }}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca per nome o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-3 text-secondary placeholder:text-secondary/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-secondary/60">Nessun atleta trovato</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.has(user.id);
                    const fullName = user.full_name || 'Senza nome';
                    const avatarUrl = user.avatar_url ? getAvatarUrl(user.avatar_url) : null;

                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-secondary bg-secondary/5 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-secondary/50 hover:shadow-sm'
                        }`}
                      >
                        <div className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-secondary bg-secondary'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>

                        <div className="w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold overflow-hidden relative">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={fullName}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <span>{fullName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-secondary text-sm truncate">{fullName}</p>
                          </div>
                          <div className="flex-shrink-0 hidden sm:block max-w-[200px]">
                            <p className="text-xs text-secondary/70 truncate">{user.email}</p>
                          </div>
                          <span className="flex-shrink-0 rounded-full bg-secondary/10 px-2.5 py-1 text-xs text-secondary font-medium">
                            atleta
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer con bottone iscrizione multipla */}
            <div className="border-t border-gray-200 p-6 flex-shrink-0 bg-white">
              <button
                onClick={handleEnrollSelected}
                disabled={enrolling || selectedUserIds.size === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Iscrizione in corso...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Iscrivi {selectedUserIds.size > 0 ? `${selectedUserIds.size} Atleta/i` : 'Atleti Selezionati'}
                  </>
                )}
              </button>
            </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={currentParticipants >= maxParticipants}
        className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserPlus className="h-4 w-4" />
        Iscrivi Atleta
      </button>

      {typeof window !== 'undefined' && showModal && createPortal(
        modalContent,
        document.body
      )}
    </>
  );
}
