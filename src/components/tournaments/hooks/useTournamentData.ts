"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface TournamentMetaChange {
  participantsCount: number;
  maxParticipants: number;
  currentPhase: string;
  status: string;
  tournamentType?: string;
}

interface UseTournamentDataParams {
  tournamentId: string;
  tournamentType: string;
  maxParticipants: number;
  currentPhase: string;
  status: string;
  onMetaChange?: (meta: TournamentMetaChange) => void;
}

export function useTournamentData({
  tournamentId,
  tournamentType,
  maxParticipants,
  currentPhase,
  status,
  onMetaChange,
}: UseTournamentDataParams) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const participantsRes = await fetch(
        `/api/tournament_participants?tournament_id=${tournamentId}`
      );
      const participantsData = await participantsRes.json();
      let participantsArray: any[] = [];
      if (participantsRes.ok) {
        participantsArray = participantsData.participants || [];
        setParticipants(participantsArray);
      } else {
        setParticipants([]);
      }

      if (tournamentType === "girone_eliminazione") {
        const groupsRes = await fetch(`/api/tournaments/${tournamentId}/groups`);
        const groupsData = await groupsRes.json();
        if (groupsRes.ok) {
          setGroups(groupsData.groups || []);
        }
      }

      if (onMetaChange) {
        onMetaChange({
          participantsCount: participantsArray.length,
          maxParticipants,
          currentPhase,
          status,
          tournamentType,
        });
      }
    } catch (error) {
      console.error("Error loading tournament data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!confirm(`Sei sicuro di voler rimuovere ${participantName} dal torneo?`)) return;
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sessione non valida");
        return;
      }
      const res = await fetch(`/api/tournament_participants?id=${participantId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        toast.success("Partecipante rimosso con successo");
        void loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Errore nella rimozione del partecipante");
      }
    } catch (error) {
      console.error("Error removing participant:", error);
      toast.error("Errore nella rimozione del partecipante");
    }
  };

  const handleDeleteTournament = async () => {
    if (
      !confirm(
        "⚠️ ATTENZIONE: Sei sicuro di voler eliminare questo torneo?\n\nQuesta azione è irreversibile e cancellerà:\n- Il torneo\n- Tutti i partecipanti\n- Tutte le partite\n- Tutte le statistiche"
      )
    )
      return;
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sessione non valida");
        return;
      }
      const res = await fetch(`/api/tournaments?id=${tournamentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        toast.success("Torneo eliminato con successo");
        window.location.href = "/dashboard/admin/tornei";
      } else {
        const data = await res.json();
        toast.error(data.error || "Errore nell'eliminazione del torneo");
      }
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error("Errore nell'eliminazione del torneo");
    }
  };

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  return {
    participants,
    groups,
    loading,
    loadData,
    handleRemoveParticipant,
    handleDeleteTournament,
  };
}
