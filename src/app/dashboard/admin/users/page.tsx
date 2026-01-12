"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Loader2, Search, Crown, GraduationCap, Home, UserCheck, Ticket, Plus, UserPlus, Trash2, Edit2, X, Check } from "lucide-react";
import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, phone, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(userId: string, userEmail: string) {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${userEmail}?`)) {
      return;
    }

    try {
      // Prima elimina il profilo
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      alert("Utente eliminato con successo!");
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      alert(error.message || "Errore durante l'eliminazione dell'utente");
    }
  }

  const roleLabels = {
    admin: { label: "Admin", color: "bg-secondary text-white border-0", icon: Crown },
    gestore: { label: "Gestore", color: "bg-secondary text-white border-0", icon: Home },
    maestro: { label: "Maestro", color: "bg-secondary text-white border-0", icon: GraduationCap },
    atleta: { label: "Atleta", color: "bg-secondary text-white border-0", icon: UserCheck },
  };

  const filteredUsers = users.filter((user) => {
    const matchesRole = filter === "all" || user.role === filter;
    const matchesSearch = !search || 
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === "admin").length,
    gestore: users.filter(u => u.role === "gestore").length,
    maestro: users.filter(u => u.role === "maestro").length,
    atleta: users.filter(u => u.role === "atleta").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Anagrafica Utenti
          </h1>
          <p className="text-secondary/70 font-medium">
            Gestisci tutti gli utenti registrati sulla piattaforma
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/users/new"
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Crea Utente
          </Link>
          <Link
            href="/dashboard/admin/invite-codes"
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <Ticket className="h-4 w-4" />
            Codici Invito
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              filter === "all"
                ? "text-white bg-secondary hover:opacity-90"
                : "bg-white text-secondary/70 hover:bg-secondary/5"
            }`}
          >
            Tutti
          </button>
          {Object.entries(roleLabels).map(([role, { label }]) => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                filter === role
                  ? "text-white bg-secondary hover:opacity-90"
                  : "bg-white text-secondary/70 hover:bg-secondary/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento utenti...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Users className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun utente trovato</h3>
          <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header Row */}
          <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
            <div className="flex items-center gap-4">
              <div className="w-12 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-white/80 uppercase">#</div>
              </div>
              <div className="w-48 flex-shrink-0">
                <div className="text-xs font-bold text-white/80 uppercase">Nome</div>
              </div>
              <div className="w-56 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-white/80 uppercase">Email</div>
              </div>
              <div className="w-32 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-white/80 uppercase">Telefono</div>
              </div>
              <div className="w-28 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-white/80 uppercase">Ruolo</div>
              </div>
            </div>
          </div>

          {/* Data Rows */}
          {filteredUsers.map((user) => {
            const roleInfo = roleLabels[user.role];
            const Icon = roleInfo.icon;
            
            // Determina il colore del bordo in base al ruolo usando colori scuri
            let borderColor = "#0690c6"; // frozen-600 - default
            if (user.role === "admin") {
              borderColor = "#dc2626"; // red-600 - rosso scuro per admin
            } else if (user.role === "gestore") {
              borderColor = "#d97706"; // amber-600 - arancione scuro per gestore
            } else if (user.role === "maestro") {
              borderColor = "#059669"; // emerald-600 - verde scuro per maestro
            } else if (user.role === "atleta") {
              borderColor = "#0690c6"; // frozen-600 - blu scuro per atleta
            }

            return (
              <Link
                key={user.id}
                href={`/dashboard/admin/users/modifica?id=${user.id}`}
                className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all block cursor-pointer border-l-4"
                style={{ borderLeftColor: borderColor }}
              >
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 flex-shrink-0 flex justify-center">
                      <div className={`w-12 h-12 rounded-lg ${roleInfo.color} flex items-center justify-center text-lg font-bold border overflow-hidden`}>
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.full_name || "Avatar"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{user.full_name?.charAt(0)?.toUpperCase() || "U"}</span>
                        )}
                      </div>
                    </div>

                    {/* Nome */}
                    <div className="w-48 flex-shrink-0">
                      <h3 className="text-sm font-bold text-secondary truncate">
                        {user.full_name || "Nome non impostato"}
                      </h3>
                    </div>

                    {/* Email */}
                    <div className="w-56 flex-shrink-0 flex justify-center">
                      <p className="text-sm text-secondary/70 truncate">{user.email}</p>
                    </div>

                    {/* Telefono */}
                    <div className="w-32 flex-shrink-0 flex justify-center">
                      {user.phone ? (
                        <p className="text-sm text-secondary/70 truncate">{user.phone}</p>
                      ) : (
                        <p className="text-sm text-secondary/30">-</p>
                      )}
                    </div>

                    {/* Ruolo */}
                    <div className="w-28 flex-shrink-0 flex justify-center">
                      <div className={`w-10 h-10 rounded-lg ${roleInfo.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
