"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Loader2, AlertCircle, User, Mail, Phone, Calendar, MapPin, CreditCard, FileText, Award, Crown, GraduationCap, Home, UserCheck, Pencil, Shield } from "lucide-react";

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

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null);
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
    } catch (error: any) {
      console.error("Error loading user:", error);
      setError(error.message || "Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  }

  const roleLabels = {
    admin: { label: "Admin", icon: Crown, bgColor: "bg-[#022431]", textColor: "text-[#022431]", borderColor: "#022431" },
    gestore: { label: "Gestore", icon: Home, bgColor: "bg-[#044462]", textColor: "text-[#044462]", borderColor: "#044462" },
    maestro: { label: "Maestro", icon: GraduationCap, bgColor: "bg-[#056c94]", textColor: "text-[#056c94]", borderColor: "#056c94" },
    atleta: { label: "Atleta", icon: UserCheck, bgColor: "bg-[#08b3f7]", textColor: "text-[#08b3f7]", borderColor: "#08b3f7" },
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
      <div className="flex flex-col gap-2">
        <div>
          <p className="breadcrumb text-secondary/60 mb-1">
            <Link
              href="/dashboard/admin/users"
              className="hover:text-secondary/80 transition-colors"
            >
              Gestione Utenti
            </Link>
            {" › "}
            <span>Profilo Utente</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Visualizza Utente</h1>
          <p className="text-secondary/70 text-sm mt-1">
            Dettagli completi del profilo utente
          </p>
        </div>
      </div>

      {/* Avatar e Info Base */}
      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-4 sm:p-6 border-l-4"
        style={{ borderLeftColor: roleInfo.borderColor }}
      >
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {user.full_name || "Nome non impostato"}
            </h2>
          </div>
        </div>
      </div>

      {/* Informazioni Utente */}
      <div className="bg-white rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-secondary mb-4 sm:mb-6">Informazioni Utente</h2>

        <div className="space-y-4 sm:space-y-6">
          {/* Nome Completo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Nome Completo
            </label>
            <div className="flex-1">
              <p className="text-secondary">{user.full_name || "-"}</p>
            </div>
          </div>

          {/* Telefono */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Telefono
            </label>
            <div className="flex-1">
              <p className="text-secondary">{user.phone || "-"}</p>
            </div>
          </div>

          {/* Data di nascita */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Data di Nascita
            </label>
            <div className="flex-1">
              <p className="text-secondary">
                {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString("it-IT") : "-"}
              </p>
            </div>
          </div>

          {/* Città di Nascita */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Città di Nascita
            </label>
            <div className="flex-1">
              <p className="text-secondary">{user.metadata?.birth_city || "-"}</p>
            </div>
          </div>

          {/* Codice Fiscale */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Codice Fiscale
            </label>
            <div className="flex-1">
              <p className="text-secondary font-mono">{user.metadata?.fiscal_code || "-"}</p>
            </div>
          </div>

          {/* Residenza - Indirizzo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Indirizzo
            </label>
            <div className="flex-1">
              <p className="text-secondary">{user.metadata?.address || "-"}</p>
            </div>
          </div>

          {/* Residenza - Città, Provincia, CAP */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Città / Provincia / CAP
            </label>
            <div className="flex-1">
              <p className="text-secondary">
                {[user.metadata?.city, user.metadata?.province, user.metadata?.postal_code]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Informazioni Account */}
      <div className="bg-white rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-secondary mb-4 sm:mb-6">Informazioni Account</h2>

        <div className="space-y-4 sm:space-y-6">
          {/* Email */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Email
            </label>
            <div className="flex-1">
              <p className="text-secondary break-all">{user.email}</p>
            </div>
          </div>

          {/* Data Registrazione */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Data Registrazione
            </label>
            <div className="flex-1">
              <p className="text-secondary">
                {new Date(user.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Informazioni Piattaforma */}
      <div className="bg-white rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-secondary mb-4 sm:mb-6">Informazioni Piattaforma</h2>

        <div className="space-y-4 sm:space-y-6">
          {/* Ruolo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Ruolo
            </label>
            <div className="flex-1">
              <p className="text-secondary">{roleInfo.label}</p>
            </div>
          </div>

          {/* Rank Arena */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-8 pb-4 sm:pb-6 border-b border-gray-200">
            <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
              Rank Arena
            </label>
            <div className="flex-1">
              <p className="text-secondary">{arenaStats?.level || "-"}</p>
            </div>
          </div>

          {/* Statistiche Arena */}
          {arenaStats && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-8">
              <label className="sm:w-48 text-sm text-secondary/70 sm:text-secondary font-medium flex-shrink-0">
                Statistiche Arena
              </label>
              <div className="flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-lg font-bold text-secondary">{arenaStats.points}</p>
                    <p className="text-xs text-secondary/60 mt-1">Punti</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-lg font-bold text-green-600">{arenaStats.wins}</p>
                    <p className="text-xs text-secondary/60 mt-1">Vittorie</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-lg font-bold text-red-600">{arenaStats.losses}</p>
                    <p className="text-xs text-secondary/60 mt-1">Sconfitte</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                    <p className="text-lg font-bold text-secondary">{arenaStats.total_matches}</p>
                    <p className="text-xs text-secondary/60 mt-1">Totali</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note */}
      <div className="bg-white rounded-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-secondary mb-4 sm:mb-6">Note</h2>

        <div>
          <p className="text-secondary whitespace-pre-wrap">{user.bio || "Nessuna nota disponibile"}</p>
        </div>
      </div>

      {/* Bottone Modifica */}
      <Link
        href={`/dashboard/admin/users/modifica?id=${userId}`}
        className="w-full px-8 py-4 text-base font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
      >
        <Pencil className="h-4 w-4" />
        Modifica Profilo
      </Link>
    </div>
  );
}
