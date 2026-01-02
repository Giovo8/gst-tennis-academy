"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Search,
  User,
  Mail,
  Shield,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription_type: string | null;
  created_at: string;
}

const ROLES = [
  { value: "atleta", label: "Atleta", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  { value: "maestro", label: "Maestro", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  { value: "gestore", label: "Gestore", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "admin", label: "Admin", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
];

export default function GestoreUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === "all" || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getRoleBadge(role: string) {
    const roleConfig = ROLES.find(r => r.value === role) || ROLES[0];
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleConfig.color}`}>
        {roleConfig.label}
      </span>
    );
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  }

  // Stats
  const stats = {
    total: users.length,
    atleti: users.filter(u => u.role === "atleta").length,
    maestri: users.filter(u => u.role === "maestro").length,
    staff: users.filter(u => ["gestore", "admin"].includes(u.role)).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
        <div className="h-12 skeleton rounded-lg" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Gestione Utenti</h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          {users.length} utenti registrati
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <Users className="h-5 w-5 text-[var(--primary)] mb-2" />
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Totale</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <User className="h-5 w-5 text-sky-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.atleti}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Atleti</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <User className="h-5 w-5 text-cyan-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.maestri}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Maestri</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
          <Shield className="h-5 w-5 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.staff}</p>
          <p className="text-sm text-[var(--foreground-muted)]">Staff</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Cerca utente per nome o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
        >
          <option value="all">Tutti i ruoli</option>
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Users List */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-[var(--foreground-muted)]">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nessun utente trovato</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-[var(--primary)]">
                        {getInitials(user.full_name, user.email)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {user.full_name || "Senza nome"}
                      </p>
                      <p className="text-sm text-[var(--foreground-muted)] flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getRoleBadge(user.role)}
                    <span className="text-sm text-[var(--foreground-muted)] hidden sm:block">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
