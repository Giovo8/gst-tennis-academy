"use client";

import { useEffect, useState } from "react";
import { Users, Search, Mail, Shield, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

export default function GestoreUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "atleta" | "maestro">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadUsers();
  }, [filter]);

  async function loadUsers() {
    setLoading(true);
    
    let query = supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("role", filter);
    }

    const { data, error } = await query.limit(100);

    if (!error && data) {
      setUsers(data);
    }
    
    setLoading(false);
  }

  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  });

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      gestore: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      maestro: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      atleta: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    };
    return styles[role] || styles.atleta;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Gestione Utenti</h1>
        <p className="text-muted-2">Visualizza e gestisci gli utenti dell&apos;academy</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
          <input
            type="text"
            placeholder="Cerca per nome o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted-2 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "atleta", "maestro"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-muted-2 hover:bg-white/10"
              }`}
            >
              {f === "all" ? "Tutti" : f === "atleta" ? "Atleti" : "Maestri"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-muted-2">Totale Utenti</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-sm text-cyan-300">Atleti</p>
          <p className="text-2xl font-bold text-white">{users.filter(u => u.role === "atleta").length}</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-300">Maestri</p>
          <p className="text-2xl font-bold text-white">{users.filter(u => u.role === "maestro").length}</p>
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-2">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nessun utente trovato</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-white/5 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-emerald-400">
                        {(user.full_name || user.email)?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {user.full_name || "Nome non impostato"}
                      </p>
                      <p className="text-sm text-muted-2 flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
