"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Calendar,
  Users,
  ChevronRight,
  Loader2,
  Check,
  Star,
  RefreshCw,
  Search,
  Filter,
  MapPin,
  Archive,
  BarChart3,
  Award,
  Target,
  Shield,
  LayoutGrid,
  Activity,
} from "lucide-react";

interface Tournament {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  category: string;
  level: string;
  max_participants: number;
  status: string;
  format: string;
  entry_fee: number | null;
  prize_money: number | null;
  participant_count?: number;
  is_registered?: boolean;
}

export default function TournamentsPage() {  const router = useRouter();  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [archivedTournaments, setArchivedTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "my" | "archive" | "stats">("my");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalParticipations: 0,
    activeTournaments: 0,
    completedTournaments: 0,
    winRate: 0,
  });

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Load all tournaments using API
      const res = await fetch('/api/tournaments');
      const json = await res.json();
      
      if (res.ok && json.tournaments) {
        const allTournaments = json.tournaments;

        // Load user's registered tournaments
        const { data: registrations } = await supabase
          .from("tournament_participants")
          .select("tournament_id")
          .eq("user_id", user.id);

        const registeredIds = new Set(registrations?.map(r => r.tournament_id) || []);

        // Process tournaments
        const processed = allTournaments.map((t: any) => ({
          ...t,
          participant_count: 0,
          is_registered: registeredIds.has(t.id),
          starts_at: t.start_date || t.starts_at,
        }));

        // Separate active and archived
        const active = processed.filter((t: any) => 
          t.status !== 'Concluso' && 
          t.status !== 'Completato' && 
          t.status !== 'Chiuso'
        );
        const archived = processed.filter((t: any) => 
          t.status === 'Concluso' || 
          t.status === 'Completato' || 
          t.status === 'Chiuso'
        );

        setTournaments(active.filter((t: any) => !t.is_registered));
        setMyTournaments(active.filter((t: any) => t.is_registered));
        setArchivedTournaments(archived.filter((t: any) => t.is_registered));

        // Calculate stats
        const totalParticipations = registeredIds.size;
        const activeTournaments = active.filter((t: any) => t.is_registered).length;
        const completedTournaments = archived.filter((t: any) => t.is_registered).length;
        
        setStats({
          totalParticipations,
          activeTournaments,
          completedTournaments,
          winRate: 0, // TODO: calculate from match results
        });
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function registerForTournament(tournamentId: string) {
    setRegistering(tournamentId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tournament = tournaments.find(t => t.id === tournamentId);

    const { error } = await supabase
      .from("tournament_participants")
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
      });

    if (!error) {
      // Send notification to user
      if (tournament) {
        await createNotification({
          userId: user.id,
          type: "tournament",
          title: "Iscrizione al torneo confermata",
          message: `Ti sei iscritto con successo al torneo: ${tournament.name}`,
          link: "/dashboard/atleta/tornei",
        });

        // Move tournament from available to my tournaments
        setTournaments(tournaments.filter(t => t.id !== tournamentId));
        setMyTournaments([...myTournaments, { ...tournament, is_registered: true }]);
      }
    }

    setRegistering(null);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      Aperto: "bg-secondary/10 text-secondary",
      "In Corso": "bg-secondary/10 text-secondary",
      Concluso: "bg-gray-100 text-gray-700",
      Annullato: "bg-red-50 text-red-700",
    };
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-md ${styles[status] || styles.Aperto}`}>
        {status}
      </span>
    );
  }

  function getLevelBadge(level: string) {
    if (!level) return null;
    
    const styles: Record<string, string> = {
      principiante: "bg-emerald-50 text-emerald-700",
      intermedio: "bg-amber-50 text-amber-700",
      avanzato: "bg-orange-50 text-orange-700",
      agonistico: "bg-red-50 text-red-700",
      open: "bg-blue-50 text-blue-700",
    };
    
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-md inline-flex items-center gap-1 ${styles[level?.toLowerCase()] || "bg-gray-50 text-gray-700"}`}>
        <Activity className="h-3 w-3" />
        {level}
      </span>
    );
  }

  function getTournamentTypeBadge(tournamentType?: string) {
    if (!tournamentType) return null;
    
    const labels: Record<string, string> = {
      'eliminazione_diretta': 'Eliminazione Diretta',
      'girone_eliminazione': 'Gironi + Eliminazione',
      'campionato': 'Campionato',
    };
    
    return labels[tournamentType] || tournamentType;
  }

  const getTournamentIconSmall = (tournamentType?: string) => {
    return <LayoutGrid className="h-4 w-4 text-secondary/40" />;
  };

  const getTournamentIcon = (tournamentType?: string) => {
    switch (tournamentType) {
      case 'campionato':
        return <Award className="h-6 w-6 text-secondary" />;
      case 'girone_eliminazione':
        return <Shield className="h-6 w-6 text-secondary" />;
      case 'eliminazione_diretta':
      default:
        return <Trophy className="h-6 w-6 text-secondary" />;
    }
  };

  const TournamentCard = ({ tournament, showRegister = false }: { tournament: Tournament; showRegister?: boolean }) => {
    const handleClick = () => {
      router.push(`/dashboard/atleta/tornei/${tournament.id}`);
    };

    return (
      <div 
        onClick={handleClick}
        className="bg-white rounded-md p-5 hover:shadow-md transition-all border border-gray-100 cursor-pointer"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Icona e Titolo */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="p-3 rounded-lg bg-secondary/10 flex-shrink-0">
              {getTournamentIcon(tournament.tournament_type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-secondary text-lg mb-1 truncate">{tournament.title}</h3>
              {tournament.description && (
                <p className="text-sm text-secondary/60 line-clamp-1">
                  {tournament.description}
                </p>
              )}
            </div>
          </div>

          {/* Info centrale */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            {/* Data */}
            <div className="flex items-center gap-2 text-secondary/70 w-32">
              <Calendar className="h-4 w-4 text-secondary/40" />
              <span className="text-sm font-medium">{formatDate(tournament.starts_at)}</span>
            </div>

            {/* Partecipanti */}
            <div className="flex items-center gap-2 text-secondary/70 w-32">
              <Users className="h-4 w-4 text-secondary/40" />
              <span className="text-sm font-medium">{tournament.participant_count || 0}/{tournament.max_participants}</span>
            </div>

            {/* Tipo Competizione */}
            {tournament.tournament_type && (
              <div className="flex items-center gap-2 text-secondary/70 w-40">
                {getTournamentIconSmall(tournament.tournament_type)}
                <span className="text-sm font-medium truncate">{getTournamentTypeBadge(tournament.tournament_type)}</span>
              </div>
            )}

            {/* Categoria */}
            {tournament.category && (
              <div className="flex items-center gap-2 text-secondary/70 w-32">
                <MapPin className="h-4 w-4 text-secondary/40" />
                <span className="text-sm font-medium truncate">{tournament.category}</span>
              </div>
            )}
          </div>

          {/* Badge e azioni */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex flex-col gap-1.5">
              {getStatusBadge(tournament.status)}
              {getLevelBadge(tournament.level)}
            </div>

            {showRegister && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  registerForTournament(tournament.id);
                }}
                disabled={registering === tournament.id || (tournament.participant_count || 0) >= tournament.max_participants}
                className="px-4 py-2 text-sm text-white bg-secondary rounded-md font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {registering === tournament.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Iscrizione...</span>
                  </>
                ) : (tournament.participant_count || 0) >= tournament.max_participants ? (
                  "Completo"
                ) : (
                  <span>Iscriviti</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Info mobile */}
        <div className="md:hidden mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-secondary/70">
            <Calendar className="h-3.5 w-3.5 text-secondary/40" />
            <span className="font-medium">{formatDate(tournament.starts_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-secondary/70">
            <Users className="h-3.5 w-3.5 text-secondary/40" />
            <span className="font-medium">{tournament.participant_count || 0}/{tournament.max_participants}</span>
          </div>
          {tournament.tournament_type && (
            <div className="flex items-center gap-1.5 text-secondary/70">
              <LayoutGrid className="h-3.5 w-3.5 text-secondary/40" />
              <span className="font-medium">{getTournamentTypeBadge(tournament.tournament_type)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-lg w-80" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Competizioni</h1>
          <p className="text-secondary/70 font-medium">
            Partecipa ai tornei del circolo e metti alla prova le tue abilità
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("archive")}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            Storico
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Statistiche
          </button>
          <button
            onClick={loadTournaments}
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome, descrizione o categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/30"
          />
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === "my"
                ? "text-white bg-secondary hover:opacity-90"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            I Miei Tornei
          </button>
          <button
            onClick={() => setActiveTab("available")}
            className={`px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === "available"
                ? "text-white bg-secondary hover:opacity-90"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Disponibili
          </button>
        </div>
      </div>

      {/* Statistiche */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-8 w-8 text-secondary/40" />
                <span className="text-3xl font-bold text-secondary">{stats.totalParticipations}</span>
              </div>
              <p className="text-sm font-semibold text-secondary/70">Tornei totali</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-8 w-8 text-emerald-500/60" />
                <span className="text-3xl font-bold text-secondary">{stats.activeTournaments}</span>
              </div>
              <p className="text-sm font-semibold text-secondary/70">In corso</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Award className="h-8 w-8 text-amber-500/60" />
                <span className="text-3xl font-bold text-secondary">{stats.completedTournaments}</span>
              </div>
              <p className="text-sm font-semibold text-secondary/70">Completati</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="h-8 w-8 text-secondary/40" />
                <span className="text-3xl font-bold text-secondary">{stats.winRate}%</span>
              </div>
              <p className="text-sm font-semibold text-secondary/70">Vittorie</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attività recente
            </h3>
            <div className="space-y-3">
              {myTournaments.length === 0 && archivedTournaments.length === 0 ? (
                <p className="text-center py-8 text-secondary/60">Nessuna attività recente</p>
              ) : (
                [...myTournaments, ...archivedTournaments]
                  .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
                  .slice(0, 5)
                  .map((tournament) => (
                    <div key={tournament.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-secondary/40" />
                        <div>
                          <p className="font-semibold text-secondary">{tournament.title}</p>
                          <p className="text-xs text-secondary/60">{formatDate(tournament.starts_at)}</p>
                        </div>
                      </div>
                      {getStatusBadge(tournament.status)}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tournament Grid */}
      {activeTab === "my" && (
        myTournaments.filter(t => 
          !searchQuery || 
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <Trophy className="h-16 w-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">
              {myTournaments.length === 0 ? "Non sei iscritto a nessun torneo" : "Nessun torneo trovato"}
            </h3>
            <p className="text-secondary/70 mb-6">
              {myTournaments.length === 0 
                ? "Iscriviti a un torneo dalla sezione \"Disponibili\""
                : "Prova a modificare la ricerca"
              }
            </p>
            {myTournaments.length === 0 && (
              <button
                onClick={() => setActiveTab("available")}
                className="px-6 py-2.5 bg-secondary text-white rounded-lg font-semibold hover:opacity-90 transition-all"
              >
                Vedi Tornei Disponibili
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {myTournaments
              .filter(t => 
                !searchQuery || 
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
          </div>
        )
      )}

      {activeTab === "available" && (
        tournaments.filter(t => 
          !searchQuery || 
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <Trophy className="h-16 w-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">
              {tournaments.length === 0 ? "Nessun torneo disponibile" : "Nessun torneo trovato"}
            </h3>
            <p className="text-secondary/70">
              {tournaments.length === 0 
                ? "Nuovi tornei saranno annunciati presto"
                : "Prova a modificare la ricerca"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments
              .filter(t => 
                !searchQuery || 
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} showRegister />
              ))}
          </div>
        )
      )}

      {/* Storico */}
      {activeTab === "archive" && (
        archivedTournaments.filter(t => 
          !searchQuery || 
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <Archive className="h-16 w-16 mx-auto text-secondary/20 mb-4" />
            <h3 className="text-xl font-semibold text-secondary mb-2">
              {archivedTournaments.length === 0 ? "Nessun torneo completato" : "Nessun torneo trovato"}
            </h3>
            <p className="text-secondary/70">
              {archivedTournaments.length === 0 
                ? "I tornei completati appariranno qui"
                : "Prova a modificare la ricerca"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivedTournaments
              .filter(t => 
                !searchQuery || 
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
          </div>
        )
      )}
    </div>
  );
}
