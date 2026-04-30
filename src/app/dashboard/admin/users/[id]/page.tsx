"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Loader2, AlertCircle, User, Mail, Phone, Calendar, MapPin, CreditCard, FileText, Award, Crown, Dumbbell, Home, UserCheck, Pencil, Shield, Trash2, KeyRound } from "lucide-react";

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  date_of_birth: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  metadata: {
    birth_city?: string;
    fiscal_code?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  } | null;
};

type ArenaStats = {
  level: string;
  points: number;
  wins: number;
  losses: number;
  total_matches: number;
};

type UserProfilePageProps = {
  basePath?: string;
};

export default function UserProfilePage({ basePath = "/dashboard/admin" }: UserProfilePageProps) {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null);
  const [prenotazioniCampo, setPrenotazioniCampo] = useState(0);
  const [lezioniPrivate, setLezioniPrivate] = useState(0);
  const [videoLab, setVideoLab] = useState(0);
  const [torneiCompletati, setTorneiCompletati] = useState(0);
  const [deletingUser, setDeletingUser] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  async function loadUserProfile() {
    try {
      // Carica profilo utente
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      
      setUser(profileData);
      document.title = `${profileData.full_name || "Utente"} | GST Tennis Academy`;

      // Carica statistiche Arena
      const { data: arenaData } = await supabase
        .from("arena_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (arenaData) {
        setArenaStats(arenaData);
      }

      // Carica conteggio Prenotazioni Campo
      const { count: campoCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .eq("type", "campo");

      if (campoCount !== null) {
        setPrenotazioniCampo(campoCount);
      }

      // Carica conteggio Lezioni Private
      const { count: lezioniCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .eq("type", "lezione_privata");

      if (lezioniCount !== null) {
        setLezioniPrivate(lezioniCount);
      }

      // Video Lab - placeholder (table non ancora presente)
      setVideoLab(0);

      // Carica conteggio Tornei Completati
      const { count: tournamentsCount } = await supabase
        .from("tournament_participants")
        .select("tournament_id", { count: "exact" })
        .eq("user_id", userId);

      if (tournamentsCount !== null) {
        // Filtriamo solo i tornei con status = 'Concluso'
        const { data: completedTournaments } = await supabase
          .from("tournament_participants")
          .select("tournament_id, tournaments(status)")
          .eq("user_id", userId);

        if (completedTournaments) {
          const completed = completedTournaments.filter(
            (t: any) => t.tournaments?.status === "Concluso"
          ).length;
          setTorneiCompletati(completed);
        }
      }
    } catch (error: any) {
      console.error("Error loading user:", error);
      setError(error.message || "Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  }

  const roleLabels = {
    admin:   { label: "Admin",   icon: Crown,       bgColor: "#023047",          borderLeftColor: "#011a24" },
    gestore: { label: "Gestore", icon: Home,         bgColor: "#023047",          borderLeftColor: "#011a24" },
    maestro: { label: "Maestro", icon: Dumbbell,      bgColor: "#05384c",         borderLeftColor: "#022431" },
    atleta:  { label: "Atleta",  icon: User,         bgColor: "var(--secondary)", borderLeftColor: "#023047" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error || "Utente non trovato"}</p>
          </div>
        </div>
      </div>
    );
  }

  const roleInfo = roleLabels[user.role];
  const RoleIcon = roleInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link
            href={`${basePath}/users`}
            className="hover:text-secondary/80 transition-colors"
          >
            Gestione Utenti
          </Link>
          {" › "}
          <span>Profilo Utente</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Profilo Utente</h1>
      </div>

      {/* Header card utente */}
      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: roleInfo.bgColor,
          borderColor: roleInfo.bgColor,
          borderLeftColor: roleInfo.bgColor,
        }}
      >
        <div className="flex items-start gap-6">
          <RoleIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {user.full_name || "Nome non impostato"}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">

      {/* Informazioni Utente */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Utente</h2>
        </div>
        <div className="px-6 py-6">
          <div className="space-y-6">
          {/* Nome Completo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Nome Completo
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{user.full_name || "-"}</p>
            </div>
          </div>

          {/* Data di nascita */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Data di Nascita
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString("it-IT") : "-"}
              </p>
            </div>
          </div>

          {/* Città di Nascita */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Città di Nascita
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{user.metadata?.birth_city || "-"}</p>
            </div>
          </div>

          {/* Residenza - Indirizzo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Indirizzo
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{user.metadata?.address || "-"}</p>
            </div>
          </div>

          {/* Residenza - Città, Provincia, CAP */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Città / Provincia / CAP
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {[user.metadata?.city, user.metadata?.province, user.metadata?.postal_code]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
            </div>
          </div>

          {/* Codice Fiscale */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
              Codice Fiscale
            </label>
            <div className="flex-1">
              <p className="text-secondary font-semibold font-mono">{user.metadata?.fiscal_code || "-"}</p>
            </div>
          </div>

            {/* Telefono */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Telefono
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{user.phone || "-"}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Email
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold break-all">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informazioni Account */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Account</h2>
        </div>
        <div className="px-6 py-6">
          <div className="space-y-6">
            {/* Data Registrazione */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Data Registrazione
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">
                  {new Date(user.created_at).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
            </div>

            {/* ID Utente */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                ID Utente
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold break-all">{user.id}</p>
              </div>
            </div>

            {/* Ruolo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Ruolo
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{roleInfo.label}</p>
              </div>
            </div>

            {/* Rank Arena */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">
                Rank Arena
              </label>
              <div className="flex-1">
                <p className="text-secondary font-semibold">{arenaStats?.level || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Avatar</h2>
        </div>
        <div className="px-6 py-6">
          <div className="w-80 h-80 rounded-xl bg-secondary/10 overflow-hidden flex items-center justify-center border border-gray-200">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || "Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-40 w-40 text-secondary" />
            )}
          </div>
        </div>
      </div>

      </div>

      {/* Note */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
        </div>
        <div className="px-6 py-6">
          <p className="text-secondary whitespace-pre-wrap">{user.bio || "Nessuna nota disponibile"}</p>
        </div>
      </div>

      {/* Bottone Modifica */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`${basePath}/users/modifica?id=${userId}`}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
        >
          Modifica Profilo
        </Link>
        <button
          onClick={async () => {
            if (!confirm(`Sei sicuro di voler resettare la password di ${user.full_name || user.email}?`)) return;
            setResettingPassword(true);
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
              });
              if (error) throw error;
              alert("Email di reset password inviata con successo.");
            } catch (err: any) {
              alert("Errore: " + (err.message || "Impossibile inviare l'email di reset."));
            } finally {
              setResettingPassword(false);
            }
          }}
          disabled={resettingPassword}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Resetta Password
        </button>
        <button
          onClick={async () => {
            if (!confirm(`Sei sicuro di voler eliminare il profilo di ${user.full_name || user.email}? Questa azione è irreversibile.`)) return;
            setDeletingUser(true);
            try {
              const { error } = await supabase.from("profiles").delete().eq("id", userId);
              if (error) throw error;
              router.push(`${basePath}/users`);
            } catch (err: any) {
              alert("Errore: " + (err.message || "Impossibile eliminare l'utente."));
              setDeletingUser(false);
            }
          }}
          disabled={deletingUser}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deletingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Elimina
        </button>
      </div>
    </div>
  );
}
