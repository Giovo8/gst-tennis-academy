"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Loader2, Search, Crown, GraduationCap, Home, UserCheck, Ticket, Plus, UserPlus, Trash2, Edit2, X, Check, Pencil } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "role" | "email" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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
      // Ottieni il token di autenticazione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessione non valida");
      }

      // Chiama l'API per eliminare l'utente (profilo + auth)
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore durante l'eliminazione");
      }

      alert("Utente eliminato con successo!");
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      alert(error.message || "Errore durante l'eliminazione dell'utente");
    }
  }

  const handleSort = (column: "name" | "role" | "email") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const roleLabels = {
    admin: { label: "Admin", color: "bg-secondary text-white border-0", icon: Crown },
    gestore: { label: "Gestore", color: "bg-secondary text-white border-0", icon: Home },
    maestro: { label: "Maestro", color: "bg-secondary text-white border-0", icon: GraduationCap },
    atleta: { label: "Atleta", color: "bg-secondary text-white border-0", icon: UserCheck },
  };

  const roleOrder = { admin: 0, gestore: 1, maestro: 2, atleta: 3 };

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch = !search || 
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (!sortBy) return 0;
      
      let comparison = 0;
      if (sortBy === "name") {
        const nameA = a.full_name?.toLowerCase() || "";
        const nameB = b.full_name?.toLowerCase() || "";
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === "role") {
        comparison = roleOrder[a.role] - roleOrder[b.role];
      } else if (sortBy === "email") {
        comparison = a.email.toLowerCase().localeCompare(b.email.toLowerCase());
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
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
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-2">
            Anagrafica Utenti
          </h1>
          <p className="text-secondary/70 font-medium">
            Gestisci tutti gli utenti registrati sulla piattaforma
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/dashboard/admin/users/new"
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Crea Utente
          </Link>
          <Link
            href="/dashboard/admin/invite-codes"
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white border border-gray-200 rounded-md hover:bg-secondary/5 transition-all flex items-center justify-center gap-2"
          >
            <Ticket className="h-4 w-4" />
            Codici Invito
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
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
        <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[980px]">
          {/* Header Row */}
          <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
            <div className="flex items-center gap-4">
              <div className="w-12 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-white/80 uppercase">#</div>
              </div>
              <button
                onClick={() => handleSort("name")}
                className="w-48 flex-shrink-0 text-left hover:text-white/60 transition-colors"
              >
                <div className="text-xs font-bold text-white/80 uppercase flex items-center gap-1">
                  Nome
                  {sortBy === "name" && (
                    <span className="text-white/90">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </button>
              <button
                onClick={() => handleSort("role")}
                className="w-28 flex-shrink-0 text-left hover:text-white/60 transition-colors"
              >
                <div className="text-xs font-bold text-white/80 uppercase flex items-center gap-1">
                  Ruolo
                  {sortBy === "role" && (
                    <span className="text-white/90">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </button>
              <button
                onClick={() => handleSort("email")}
                className="w-56 flex-shrink-0 text-left hover:text-white/60 transition-colors"
              >
                <div className="text-xs font-bold text-white/80 uppercase flex items-center gap-1">
                  Email
                  {sortBy === "email" && (
                    <span className="text-white/90">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </button>
              <div className="w-32 flex-shrink-0">
                <div className="text-xs font-bold text-white/80 uppercase">Telefono</div>
              </div>
              <div className="flex-1"></div>
              <div className="w-28 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-white/80 uppercase">Azioni</div>
              </div>
            </div>
          </div>

          {/* Data Rows */}
          {filteredUsers.map((user) => {
            const roleInfo = roleLabels[user.role];
            const Icon = roleInfo.icon;
            
            // Determina il colore del bordo in base al ruolo usando palette frozen-lake
            let borderColor = "#08b3f7"; // frozen-500 - default atleta
            if (user.role === "admin") {
              borderColor = "#022431"; // frozen-900 - admin
            } else if (user.role === "gestore") {
              borderColor = "#044462"; // frozen-800 - gestore
            } else if (user.role === "maestro") {
              borderColor = "#056c94"; // frozen-700 - maestro
            } else if (user.role === "atleta") {
              borderColor = "#08b3f7"; // frozen-500 - atleta
            }

            return (
              <Link
                href={`/dashboard/admin/users/${user.id}`}
                key={user.id}
                className="block bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all border-l-4 cursor-pointer"
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
                      <h3 className="font-bold text-secondary truncate">
                        {user.full_name || "Nome non impostato"}
                      </h3>
                    </div>

                    {/* Ruolo */}
                    <div className="w-28 flex-shrink-0">
                      <span className="font-semibold text-secondary">
                        {roleInfo.label}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="w-56 flex-shrink-0">
                      <p className="text-secondary/70 truncate">{user.email}</p>
                    </div>

                    {/* Telefono */}
                    <div className="w-32 flex-shrink-0">
                      {user.phone ? (
                        <p className="text-secondary/70 truncate">{user.phone}</p>
                      ) : (
                        <p className="text-secondary/30">-</p>
                      )}
                    </div>

                    {/* Spazio flessibile */}
                    <div className="flex-1"></div>

                    {/* Azioni */}
                    <div className="w-28 flex-shrink-0 flex flex-row flex-nowrap items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.location.href = `/dashboard/admin/users/modifica?id=${user.id}`;
                        }}
                        className="flex-shrink-0 inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#08b3f7] transition-all focus:outline-none w-8 h-8"
                        title="Modifica utente"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteUser(user.id, user.email);
                        }}
                        className="flex-shrink-0 inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-all focus:outline-none w-8 h-8"
                        title="Elimina utente"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
              </Link>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
