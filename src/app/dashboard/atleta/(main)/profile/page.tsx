"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Loader2,
  AlertCircle,
  User,
  Crown,
  Dumbbell,
  Home,
} from "lucide-react";

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  date_of_birth?: string | null;
  birth_date?: string | null;
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
};

export default function AthleteProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadUserProfile();
  }, []);

  async function loadUserProfile() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setError("Utente non autenticato");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError) throw profileError;

      setUser(profileData);

      const { data: arenaData } = await supabase
        .from("arena_stats")
        .select("level")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (arenaData) {
        setArenaStats(arenaData);
      }
    } catch (err: any) {
      console.error("Error loading profile:", err);
      setError(err?.message || "Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  }

  const roleLabels = {
    admin: {
      label: "Admin",
      icon: Crown,
      bgColor: "#023047",
      borderLeftColor: "#011a24",
    },
    gestore: {
      label: "Gestore",
      icon: Home,
      bgColor: "#023047",
      borderLeftColor: "#011a24",
    },
    maestro: {
      label: "Maestro",
      icon: Dumbbell,
      bgColor: "#05384c",
      borderLeftColor: "#022431",
    },
    atleta: {
      label: "Atleta",
      icon: User,
      bgColor: "var(--secondary)",
      borderLeftColor: "#023047",
    },
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
  const dateOfBirth = user.date_of_birth || user.birth_date;

  return (
    <div className="space-y-6">
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link href="/dashboard/atleta" className="hover:text-secondary/80 transition-colors">
            Dashboard
          </Link>
          {" › "}
          <span>Profilo Utente</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Profilo Utente</h1>
      </div>

      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4"
        style={{
          backgroundColor: roleInfo.bgColor,
          borderColor: roleInfo.bgColor,
          borderLeftColor: roleInfo.borderLeftColor,
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Utente</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Nome Completo</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.full_name || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data di Nascita</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString("it-IT") : "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Citta di Nascita</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.metadata?.birth_city || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Indirizzo</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.metadata?.address || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Citta / Provincia / CAP</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {[user.metadata?.city, user.metadata?.province, user.metadata?.postal_code]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Codice Fiscale</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold font-mono">{user.metadata?.fiscal_code || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.phone || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold break-all">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Account</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data Registrazione</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {new Date(user.created_at).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">ID Utente</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold break-all">{user.id}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Ruolo</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{roleInfo.label}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Rank Arena</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{arenaStats?.level || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
        </div>
        <div className="px-6 py-6">
          <p className="text-secondary whitespace-pre-wrap">{user.bio || "Nessuna nota disponibile"}</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard/atleta/profile/modifica"
          className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
        >
          Modifica Profilo
        </Link>
      </div>
    </div>
  );
}
