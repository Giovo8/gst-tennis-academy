"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Loader2, Search, Crown, GraduationCap, Home, UserCheck, Ticket, Plus, UserPlus, Trash2, Edit2, X, Check, Eye, MoreVertical, SlidersHorizontal, KeyRound } from "lucide-react";
import Link from "next/link";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui";

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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

  async function resetPassword(userEmail: string, userName?: string | null) {
    if (!confirm(`Sei sicuro di voler resettare la password di ${userName || userEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      alert("Email di reset password inviata con successo.");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      alert(error.message || "Errore durante l'invio dell'email di reset password");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-secondary">
            Anagrafica Utenti
          </h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href={`${basePath}/users/new`}
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

      {/* Search + filtro */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per nome, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
            filterRole !== "all"
              ? "border-secondary bg-secondary text-white hover:opacity-90"
              : "border-gray-200 bg-white text-secondary hover:border-gray-300 hover:bg-gray-50"
          }`}
          title="Filtri"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
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

                  {/* Azioni */}
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (openMenuId === user.id) { closeActionMenu(); return; }
                        openActionMenu(user.id, e.currentTarget.getBoundingClientRect());
                      }}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none w-8 h-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === user.id && menuPosition && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeActionMenu(); }} />
                        <div
                          className="fixed z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`${basePath}/users/${user.id}`}
                            onClick={(e) => { e.stopPropagation(); closeActionMenu(); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Dettagli
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              window.location.href = `${basePath}/users/modifica?id=${user.id}`;
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Modifica
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              resetPassword(user.email, user.full_name);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#023b52] hover:bg-[#023b52]/10 transition-colors w-full"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Resetta Password
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              deleteUser(user.id, user.email);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#022431] hover:bg-[#022431]/10 transition-colors w-full"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Elimina
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <ModalContent
          size="md"
          className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200"
        >
          <ModalHeader className="px-4 py-3 bg-secondary border-b border-gray-200 dark:!border-gray-200">
            <ModalTitle className="text-white text-lg">Filtra Utenti</ModalTitle>
            <ModalDescription className="text-white/80 text-xs">
              Seleziona i criteri per visualizzare gli utenti.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-secondary/70">Ruolo</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="all">Tutti i ruoli</option>
                <option value="admin">Admin</option>
                <option value="gestore">Gestore</option>
                <option value="maestro">Maestro</option>
                <option value="atleta">Atleta</option>
              </select>
            </div>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={() => setFilterRole("all")}
              className="w-1/2 py-3 border-r border-gray-200 text-secondary font-semibold hover:bg-gray-50 transition-colors"
            >
              Rimuovi filtri
            </button>
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="w-1/2 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity rounded-br-lg"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
