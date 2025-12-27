"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { UserRole, roleLabels } from "@/lib/roles";
import { Plus, Edit2, Trash2, Loader2, Search, Shield, User, Eye, EyeOff, Key } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  subscription_type: string | null;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "atleta" as UserRole,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile) {
        setCurrentUserRole(profile.role);
      }
    }
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Errore caricamento utenti:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser() {
    // Validazione lato client
    if (!formData.email || !formData.password) {
      setFormError("Email e password sono obbligatorie");
      return;
    }

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError("Formato email non valido");
      return;
    }

    // Validazione password
    if (formData.password.length < 6) {
      setFormError("La password deve essere almeno 6 caratteri");
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFormError("Sessione scaduta, effettua nuovamente il login");
        return;
      }

      // Call admin API
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          email: formData.email.toLowerCase().trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore durante la creazione");
      }

      // Successo
      setShowCreateModal(false);
      setFormData({ email: "", password: "", full_name: "", role: "atleta" });
      setFormError("");
      await loadUsers();
      
      // Notifica di successo (opzionale)
      alert(`Utente ${data.user.email} creato con successo!`);
    } catch (err: any) {
      console.error("Errore creazione utente:", err);
      setFormError(err.message || "Errore durante la creazione");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdateRole(userId: string, newRole: UserRole) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
      loadUsers();
    } catch (err) {
      console.error("Errore aggiornamento ruolo:", err);
    }
  }

  async function handleResetPassword(userId: string, email: string) {
    const newPassword = prompt(`Inserisci la nuova password per ${email}:\n(minimo 6 caratteri)`);
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      alert("La password deve essere almeno 6 caratteri");
      return;
    }

    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) throw error;
      alert(`Password aggiornata con successo per ${email}`);
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Sessione scaduta, effettua nuovamente il login");
        return;
      }

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

      loadUsers();
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Gestione Utenti</h1>
            <p className="mt-1 text-sm text-[#c6d8c9]">
              Crea e gestisci account coach e atleti
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#2f7de1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2563c7]"
          >
            <Plus className="h-4 w-4" />
            Crea Utente
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9fb6a6]" />
            <input
              type="text"
              placeholder="Cerca per email o nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 px-10 py-2.5 text-sm text-white placeholder:text-[#9fb6a6] focus:border-[#2f7de1] focus:outline-none"
            />
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#2f7de1]" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2f7de1]/20 bg-[#0c1424]/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#9fb6a6]">
                      UTENTE
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#9fb6a6]">
                      RUOLO
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#9fb6a6]">
                      ABBONAMENTO
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#9fb6a6]">
                      DATA ISCRIZIONE
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#9fb6a6]">
                      AZIONI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#2f7de1]/10 transition hover:bg-[#0c1424]/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f7de1]/20">
                            {user.role === "admin" || user.role === "gestore" ? (
                              <Shield className="h-4 w-4 text-[#2f7de1]" />
                            ) : (
                              <User className="h-4 w-4 text-[#2f7de1]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {user.full_name || "N/A"}
                            </p>
                            <p className="text-xs text-[#9fb6a6]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                          disabled={currentUserRole === "gestore" && user.role === "admin"}
                          className="rounded-lg border border-[#2f7de1]/30 bg-[#0c1424]/50 px-3 py-1.5 text-xs text-white focus:border-[#2f7de1] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="atleta">Atleta</option>
                          <option value="maestro">Coach</option>
                          <option value="gestore">Gestore</option>
                          {currentUserRole === "admin" && <option value="admin">Admin</option>}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c6d8c9]">
                        {user.subscription_type || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c6d8c9]">
                        {new Date(user.created_at).toLocaleDateString("it-IT")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            disabled={currentUserRole === "gestore" && user.role === "admin"}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-[#2f7de1] transition hover:bg-[#2f7de1]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={currentUserRole === "gestore" && user.role === "admin" ? "Non puoi modificare admin" : ""}
                          >
                            <Edit2 className="h-3 w-3" />
                            Modifica
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id, user.email)}
                            disabled={currentUserRole === "gestore" && user.role === "admin"}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-yellow-400 transition hover:bg-yellow-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={currentUserRole === "gestore" && user.role === "admin" ? "Non puoi modificare admin" : ""}
                          >
                            <Key className="h-3 w-3" />
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={currentUserRole === "gestore" && user.role === "admin"}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={currentUserRole === "gestore" && user.role === "admin" ? "Non puoi eliminare admin" : ""}
                          >
                            <Trash2 className="h-3 w-3" />
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-[#9fb6a6]">Nessun utente trovato</p>
              </div>
            )}
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/95 p-6 backdrop-blur">
              <h2 className="mb-4 text-xl font-semibold text-white">Modifica Utente</h2>
              
              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-medium text-[#9fb6a6]">Email</span>
                  <p className="mt-1 text-sm text-white">{editingUser.email}</p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#c6d8c9]">Nome Completo</span>
                  <input
                    type="text"
                    value={editingUser.full_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#0c1424]/50 px-4 py-2 text-sm text-white focus:border-[#2f7de1] focus:outline-none"
                    placeholder="Mario Rossi"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#c6d8c9]">Ruolo</span>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#0c1424]/50 px-4 py-2 text-sm text-white focus:border-[#2f7de1] focus:outline-none"
                    disabled={currentUserRole === "gestore" && editingUser.role === "admin"}
                  >
                    <option value="atleta">Atleta</option>
                    <option value="maestro">Coach</option>
                    <option value="gestore">Gestore</option>
                    {currentUserRole === "admin" && <option value="admin">Admin</option>}
                  </select>
                  {currentUserRole === "gestore" && editingUser.role === "admin" && (
                    <span className="mt-1 block text-xs text-yellow-400">Non puoi modificare utenti admin</span>
                  )}
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  Annulla
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from("profiles")
                        .update({ 
                          full_name: editingUser.full_name,
                          role: editingUser.role 
                        })
                        .eq("id", editingUser.id);

                      if (error) throw error;
                      setEditingUser(null);
                      loadUsers();
                    } catch (err: any) {
                      alert(`Errore: ${err.message}`);
                    }
                  }}
                  className="flex-1 rounded-full bg-[#2f7de1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2563c7]"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#2f7de1]/30 bg-[#1a3d5c]/95 p-6 backdrop-blur">
              <h2 className="mb-4 text-xl font-semibold text-white">Crea Nuovo Utente</h2>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#c6d8c9]">Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#0c1424]/50 px-4 py-2 text-sm text-white focus:border-[#2f7de1] focus:outline-none"
                    placeholder="email@esempio.it"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#c6d8c9]">Password</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#0c1424]/50 px-4 py-2 pr-10 text-sm text-white focus:border-[#2f7de1] focus:outline-none"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9fb6a6] transition hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="mt-1 block text-xs text-[#9fb6a6]">Minimo 6 caratteri</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#c6d8c9]">Nome Completo</span>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#0c1424]/50 px-4 py-2 text-sm text-white focus:border-[#2f7de1] focus:outline-none"
                    placeholder="Mario Rossi"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[#c6d8c9]">Ruolo</span>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#0c1424]/50 px-4 py-2 text-sm text-white focus:border-[#2f7de1] focus:outline-none"
                  >
                    <option value="atleta">Atleta</option>
                    <option value="maestro">Coach</option>
                    <option value="gestore">Gestore</option>
                    {currentUserRole === "admin" && <option value="admin">Admin</option>}
                  </select>
                  {currentUserRole === "gestore" && (
                    <span className="mt-1 block text-xs text-yellow-400">Solo gli admin possono creare altri admin</span>
                  )}
                </label>

                {formError && (
                  <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                    {formError}
                  </p>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ email: "", password: "", full_name: "", role: "atleta" });
                    setFormError("");
                  }}
                  className="flex-1 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={formLoading}
                  className="flex-1 rounded-full bg-[#2f7de1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2563c7] disabled:opacity-60"
                >
                  {formLoading ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    "Crea Utente"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
