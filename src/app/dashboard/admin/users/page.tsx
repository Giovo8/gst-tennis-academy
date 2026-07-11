"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Loader2, Search, Crown, GraduationCap, Home, UserCheck, Ticket, Plus, UserPlus, Trash2, Edit2, X, Check, Eye, MoreVertical, SlidersHorizontal, KeyRound, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

type UsersPageProps = {
  basePath?: string;
};

export default function UsersPage({ basePath = "/dashboard/admin" }: UsersPageProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "role" | "email" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "gestore" | "maestro" | "atleta">("all");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

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

      toast.success("Utente eliminato con successo!");
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Errore durante l'eliminazione dell'utente");
    }
  }

  async function resetPassword(userEmail: string, userName?: string | null) {
    if (!confirm(`Sei sicuro di voler resettare la password di ${userName || userEmail}?`)) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessione non valida");
      }

      const response = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Errore durante l'invio del reset password");
      }

      toast.success("Email di reset password inviata con successo.");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Errore durante l'invio dell'email di reset password");
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

  const closeActionMenu = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const openActionMenu = (userId: string, buttonRect: DOMRect) => {
    const menuWidth = 192;
    const menuHeight = 136;
    const viewportPadding = 8;

    let left = buttonRect.right - menuWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    let top = buttonRect.bottom + 6;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, buttonRect.top - menuHeight - 6);
    }

    setOpenMenuId(userId);
    setMenuPosition({ top, left });
  };

  const roleBg: Record<Profile["role"], string> = {
    admin: "#023047",
    gestore: "#023047",
    maestro: "#05384c",
    atleta: "var(--secondary)",
  };

  const roleLabels = {
    admin: { label: "Admin", icon: Crown },
    gestore: { label: "Gestore", icon: Home },
    maestro: { label: "Maestro", icon: GraduationCap },
    atleta: { label: "Atleta", icon: UserCheck },
  };

  const roleOrder = { admin: 0, gestore: 1, maestro: 2, atleta: 3 };

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch = !search || 
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = filterRole === "all" || user.role === filterRole;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy) {
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
      }
      // default: alphabetical by full_name
      const nameA = a.full_name?.toLowerCase() || a.email.toLowerCase();
      const nameB = b.full_name?.toLowerCase() || b.email.toLowerCase();
      return nameA.localeCompare(nameB, "it");
    });

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === "admin").length,
    gestore: users.filter(u => u.role === "gestore").length,
    maestro: users.filter(u => u.role === "maestro").length,
    atleta: users.filter(u => u.role === "atleta").length,
  };

  const hasActiveFilters = filterRole !== "all";

  const renderSearchWithFilter = () => (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFilterPanelOpen((prev) => !prev)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
            hasActiveFilters || isFilterPanelOpen
              ? "border-secondary bg-secondary text-white hover:opacity-90"
              : "border-black/10 bg-white text-secondary hover:bg-gray-50"
          }`}
          aria-label="Mostra o nascondi filtri"
          title="Filtri"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {isFilterPanelOpen && (
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={() => {
              if (sortBy !== "name") {
                setSortBy("name");
                setSortOrder("asc");
                return;
              }
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
            }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
              sortBy === "name"
                ? "border-[#023047] bg-[#023047] text-white hover:opacity-90"
                : "border-black/10 bg-white text-secondary hover:bg-gray-50"
            }`}
            aria-label="Inverti ordinamento"
            title="Inverti ordinamento"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>

          <div className="flex flex-1 items-center gap-2">
            {[
              { value: "all", label: "Tutti" },
              { value: "admin", label: "Admin" },
              { value: "gestore", label: "Gestore" },
              { value: "maestro", label: "Maestro" },
              { value: "atleta", label: "Atleta" },
            ].map((option) => {
              const isSelected = filterRole === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilterRole(option.value as typeof filterRole)}
                  className={`h-11 flex-1 rounded-lg border px-2 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-secondary bg-secondary text-white"
                      : "border-black/10 bg-white text-secondary hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterRole("all");
              setSortBy(null);
              setSortOrder("asc");
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#023047] bg-[#023047] text-white hover:opacity-90 transition-colors"
            aria-label="Reset filtri"
            title="Reset filtri"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pt-3">
      {/* Header actions */}
      <div className="w-full flex items-center gap-2">
        <Link
          href={`${basePath}/users/new`}
          className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Crea Utente</span>
        </Link>
        <Link
          href="/dashboard/admin/invite-codes"
          title="Codici Invito"
          className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-[#023047] rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Ticket className="h-4 w-4" />
          <span>Codici Invito</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {renderSearchWithFilter()}
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento utenti...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <Users className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun utente trovato</h3>
          <p className="text-secondary/60">Prova a modificare i filtri di ricerca</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => {
            const roleInfo = roleLabels[user.role];
            const cardBg = roleBg[user.role];

            return (
              <div
                key={user.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: cardBg }}
              >
                <div
                  className="flex items-center gap-4 py-3 px-3"
                  onClick={() => { window.location.href = `${basePath}/users/${user.id}`; }}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name || "Avatar"} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white leading-none">
                        {user.full_name?.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U"}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{user.full_name || "Nome non impostato"}</p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">
                      {user.email}{user.phone ? ` · ${user.phone}` : ""}
                    </p>
                  </div>

                  {/* Ruolo */}
                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                    {roleInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
