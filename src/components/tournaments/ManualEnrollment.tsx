'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Search, X, Loader2, Check } from 'lucide-react';

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (showModal) {
      loadUsers();
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

      // Carica tutti gli utenti tramite API
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
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      alert(error.message || 'Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (userId: string) => {
    if (currentParticipants >= maxParticipants) {
      alert('Numero massimo di partecipanti raggiunto');
      return;
    }

    setEnrolling(true);
    setSelectedUserId(userId);

    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Sessione non valida');
        return;
      }

      const res = await fetch('/api/tournament_participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tournament_id: tournamentId,
          user_id: userId
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Atleta iscritto con successo!');
        setShowModal(false);
        onEnrollmentSuccess();
      } else {
        alert(data.error || 'Errore nell\'iscrizione');
      }
    } catch (error) {
      console.error('Error enrolling user:', error);
      alert('Errore nell\'iscrizione');
    } finally {
      setEnrolling(false);
      setSelectedUserId(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={currentParticipants >= maxParticipants}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-4 py-2 text-sm font-bold text-[#0a1929] shadow-md shadow-[#7de3ff]/30 hover:shadow-lg hover:shadow-[#7de3ff]/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UserPlus className="h-4 w-4" />
        Iscrivi Atleta
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#7de3ff]/30 bg-gradient-to-br from-[#0d1f35] to-[#0a1929] shadow-2xl shadow-[#7de3ff]/20">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#7de3ff]/20 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-[#7de3ff]/20 to-[#4fb3ff]/20 p-2.5 ring-1 ring-[#7de3ff]/30">
                  <UserPlus className="h-5 w-5 text-[#7de3ff]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Iscrivi Atleta al Torneo</h3>
                  <p className="text-xs text-gray-400">
                    Posti disponibili: {maxParticipants - currentParticipants} su {maxParticipants}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-[#7de3ff]/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca per nome o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[#7de3ff]/20 bg-[#0a1929]/60 pl-10 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-[#7de3ff]/50 focus:outline-none focus:ring-2 focus:ring-[#7de3ff]/20"
                />
              </div>
            </div>

            {/* User List */}
            <div className="max-h-96 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#7de3ff]" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">Nessun utente trovato</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg border border-[#7de3ff]/10 bg-gradient-to-r from-[#0a1929]/60 to-transparent p-4 hover:border-[#7de3ff]/30 transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-white">{user.full_name || 'Senza nome'}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <span className="mt-1 inline-block rounded-full bg-[#7de3ff]/10 px-2 py-0.5 text-xs text-[#7de3ff]">
                          {user.role}
                        </span>
                      </div>
                      <button
                        onClick={() => handleEnroll(user.id)}
                        disabled={enrolling && selectedUserId === user.id}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7de3ff] to-[#4fb3ff] px-4 py-2 text-sm font-bold text-[#0a1929] hover:shadow-lg hover:shadow-[#7de3ff]/40 transition-all disabled:opacity-50"
                      >
                        {enrolling && selectedUserId === user.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Iscrizione...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Iscrivi
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
