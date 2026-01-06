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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "atleta" as "admin" | "gestore" | "maestro" | "atleta"
  });

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

  async function createUser() {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      alert("Compila tutti i campi obbligatori");
      return;
    }

    setCreating(true);
    try {
      // Crea l'utente con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            phone: newUser.phone,
            role: newUser.role
          }
        }
      });

      if (authError) throw authError;

      // Aggiorna il profilo con il ruolo
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: newUser.full_name,
            phone: newUser.phone,
            role: newUser.role
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;
      }

      alert("Utente creato con successo!");
      setShowCreateForm(false);
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "atleta"
      });
      loadUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(error.message || "Errore durante la creazione dell'utente");
    } finally {
      setCreating(false);
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
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {showCreateForm ? "Nascondi Form" : "Crea Utente"}
          </button>
          <Link
            href="/dashboard/admin/invite-codes"
            className="px-4 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all flex items-center gap-2"
          >
            <Ticket className="h-4 w-4" />
            Codici Invito
          </Link>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold text-secondary mb-4">Crea Nuovo Utente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="email@esempio.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Password *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Minimo 6 caratteri"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Nome Completo *</label>
              <input
                type="text"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Mario Rossi"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Telefono</label>
              <input
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="+39 123 456 7890"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Ruolo *</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="atleta">Atleta</option>
                <option value="maestro">Maestro</option>
                <option value="gestore">Gestore</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={createUser}
              disabled={creating}
              className="px-6 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crea Utente
                </>
              )}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-6 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

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
          <div className="bg-secondary/5 rounded-md px-5 py-3">
            <div className="flex items-center gap-6">
              <div className="w-64">
                <div className="text-xs font-bold text-secondary/60 uppercase">Utente</div>
              </div>
              <div className="w-56">
                <div className="text-xs font-bold text-secondary/60 uppercase">Email</div>
              </div>
              <div className="w-40">
                <div className="text-xs font-bold text-secondary/60 uppercase">Telefono</div>
              </div>
              <div className="w-32">
                <div className="text-xs font-bold text-secondary/60 uppercase">Ruolo</div>
              </div>
            </div>
          </div>

          {/* Data Rows */}
          {filteredUsers.map((user) => {
            const roleInfo = roleLabels[user.role];
            const Icon = roleInfo.icon;
            return (
              <Link
                key={user.id}
                href={`/dashboard/admin/users/modifica?id=${user.id}`}
                className="block bg-white rounded-md p-5 hover:bg-secondary/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-6">
                    {/* Nome e Avatar */}
                    <div className="flex items-center gap-4 w-64">
                      <div className={`w-12 h-12 rounded-lg ${roleInfo.color} flex items-center justify-center text-lg font-bold border flex-shrink-0 overflow-hidden`}>
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
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-secondary truncate">
                          {user.full_name || "Nome non impostato"}
                        </h3>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="w-56">
                      <p className="text-sm font-semibold text-secondary truncate">{user.email}</p>
                    </div>

                    {/* Telefono */}
                    <div className="w-40">
                      {user.phone ? (
                        <p className="text-sm font-semibold text-secondary truncate">{user.phone}</p>
                      ) : (
                        <p className="text-sm text-secondary/30">-</p>
                      )}
                    </div>

                    {/* Ruolo */}
                    <div className="w-32">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md ${roleInfo.color} whitespace-nowrap`}>
                        <Icon className="w-3 h-3" />
                        {roleInfo.label}
                      </span>
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
