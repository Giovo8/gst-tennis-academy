"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { UserRole, roleLabels } from "@/lib/roles";
import { Plus, Edit2, Trash2, Loader2, Search, Shield, User, Eye, EyeOff, Key, Phone, MapPin, Calendar, FileText, X, Users } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  subscription_type: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);
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
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("Nessuna sessione attiva");
        return;
      }

      // Use API endpoint to get all users (bypasses RLS)
      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore caricamento utenti");
      }

      const data = await response.json();
      setUsers(data.users || []);
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
      
      // Notifica di successo
      setFormError("");
    } catch (err: any) {
      setFormError(err.message || "Errore durante la creazione");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdateRole(userId: string, newRole: UserRole) {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Sessione scaduta, effettua nuovamente il login");
        return;
      }

      // Use API endpoint to update role (bypasses RLS)
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore aggiornamento ruolo");
      }

      loadUsers();
    } catch (err: any) {
      alert(`Errore: ${err.message}`);
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
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-16 bg-[#021627] text-white">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestione Utenti
          </p>
          <h1 className="text-4xl font-bold text-white">Utenti</h1>
          <p className="text-sm text-muted">Crea e gestisci account coach e atleti</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Totale" value={users.length} icon={<Users className="h-8 w-8 text-blue-400" />} color="blue" />
          <StatCard title="Atleti" value={users.filter(u => u.role === 'atleta').length} icon={<User className="h-8 w-8 text-blue-300" />} color="green" />
          <StatCard title="Coach" value={users.filter(u => u.role === 'maestro').length} icon={<User className="h-8 w-8 text-cyan-300" />} color="purple" />
          <StatCard title="Staff" value={users.filter(u => u.role === 'gestore' || u.role === 'admin').length} icon={<Shield className="h-8 w-8 text-yellow-400" />} color="yellow" />
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-2" />
            <input
              type="text"
              placeholder="Cerca per email o nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#1a3d5c]/60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-muted-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-[#06101f] transition hover:bg-[#5fc7e0] hover:shadow-lg hover:shadow-accent/20"
          >
            <Plus className="h-5 w-5" />
            Crea Utente
          </button>
        </div>

        {/* Users List */}
        {/* Users List */}
        {loading ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted">Caricamento utenti...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60">
            <User className="h-12 w-12 text-muted-2 mx-auto mb-4" />
            <p className="text-lg font-medium text-white mb-2">Nessun utente trovato</p>
            <p className="text-sm text-muted">
              {searchQuery ? "Prova a modificare i criteri di ricerca" : "Inizia creando il primo utente"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="group rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 hover:bg-[#1a3d5c]/80 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10"
              >
                {/* User Avatar and Role Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 ring-2 ring-accent/30">
                      {user.role === "admin" || user.role === "gestore" ? (
                        <Shield className="h-6 w-6 text-accent" />
                      ) : (
                        <User className="h-6 w-6 text-accent" />
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{user.full_name || "N/A"}</p>
                      <p className="text-xs text-muted truncate max-w-[140px]">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Role Select */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-muted-2 mb-2">Ruolo</label>
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                    disabled={currentUserRole === "gestore" && user.role === "admin"}
                    className="w-full rounded-lg border border-[#2f7de1]/30 bg-[#0c1424]/50 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <option value="atleta">Atleta</option>
                    <option value="maestro">Coach</option>
                    <option value="gestore">Gestore</option>
                    {currentUserRole === "admin" && <option value="admin">Admin</option>}
                  </select>
                </div>

                {/* Date */}
                <div className="mb-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-muted-2">Iscritto il</p>
                  <p className="text-sm font-medium text-white mt-1">
                    {new Date(user.created_at).toLocaleDateString("it-IT", { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingUser(user)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent/20"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Dettagli
                  </button>
                  <button
                    onClick={() => handleResetPassword(user.id, user.email)}
                    disabled={currentUserRole === "gestore" && user.role === "admin"}
                    className="inline-flex items-center justify-center rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-2 text-yellow-400 transition hover:bg-yellow-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={currentUserRole === "gestore" && user.role === "admin" ? "Non puoi modificare admin" : "Reset password"}
                  >
                    <Key className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={currentUserRole === "gestore" && user.role === "admin"}
                    className="inline-flex items-center justify-center rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-cyan-300 transition hover:bg-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={currentUserRole === "gestore" && user.role === "admin" ? "Non puoi eliminare admin" : "Elimina utente"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View User Details Modal - Scheda Anagrafica */}
        {viewingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-4xl rounded-2xl border border-[#2f7de1]/30 bg-[#0d1f35]/98 p-8 shadow-2xl my-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 ring-4 ring-accent/30">
                    {viewingUser.role === "admin" || viewingUser.role === "gestore" ? (
                      <Shield className="h-8 w-8 text-accent" />
                    ) : (
                      <User className="h-8 w-8 text-accent" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{viewingUser.full_name || "Utente"}</h2>
                    <p className="text-sm text-muted mt-1">{viewingUser.email}</p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent">
                      {roleLabels[viewingUser.role]}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewingUser(null)}
                  className="rounded-lg p-2 text-muted-2 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Informazioni Personali */}
                <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-accent" />
                    Informazioni Personali
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-2">Nome Completo</label>
                      <input
                        type="text"
                        value={viewingUser.full_name || ""}
                        onChange={(e) => setViewingUser({ ...viewingUser, full_name: e.target.value })}
                        disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-[#0c1424]/50 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        placeholder="Mario Rossi"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-2">Telefono</label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
                        <input
                          type="tel"
                          value={viewingUser.phone || ""}
                          onChange={(e) => setViewingUser({ ...viewingUser, phone: e.target.value })}
                          disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                          className="w-full rounded-lg border border-white/15 bg-[#0c1424]/50 pl-10 pr-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          placeholder="+39 123 456 7890"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-2">Data di Nascita</label>
                      <div className="relative mt-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-2" />
                        <input
                          type="date"
                          value={viewingUser.date_of_birth || ""}
                          onChange={(e) => setViewingUser({ ...viewingUser, date_of_birth: e.target.value })}
                          disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                          className="w-full rounded-lg border border-white/15 bg-[#0c1424]/50 pl-10 pr-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indirizzo */}
                <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-accent" />
                    Indirizzo
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-2">Via</label>
                      <input
                        type="text"
                        value={viewingUser.address || ""}
                        onChange={(e) => setViewingUser({ ...viewingUser, address: e.target.value })}
                        disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-[#0c1424]/50 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        placeholder="Via Roma, 123"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-2">Città</label>
                        <input
                          type="text"
                          value={viewingUser.city || ""}
                          onChange={(e) => setViewingUser({ ...viewingUser, city: e.target.value })}
                          disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-[#0c1424]/50 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          placeholder="Roma"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-2">CAP</label>
                        <input
                          type="text"
                          value={viewingUser.postal_code || ""}
                          onChange={(e) => setViewingUser({ ...viewingUser, postal_code: e.target.value })}
                          disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                          className="mt-1 w-full rounded-lg border border-white/15 bg-[#0c1424]/50 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          placeholder="00100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-2">Ruolo</label>
                      <select
                        value={viewingUser.role}
                        onChange={(e) => setViewingUser({ ...viewingUser, role: e.target.value as UserRole })}
                        disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                        className="mt-1 w-full rounded-lg border border-white/15 bg-[#0c1424]/50 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <option value="atleta">Atleta</option>
                        <option value="maestro">Coach</option>
                        <option value="gestore">Gestore</option>
                        {currentUserRole === "admin" && <option value="admin">Admin</option>}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 md:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Note
                  </h3>
                  <textarea
                    value={viewingUser.notes || ""}
                    onChange={(e) => setViewingUser({ ...viewingUser, notes: e.target.value })}
                    disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                    rows={4}
                    className="w-full rounded-lg border border-white/15 bg-[#0c1424]/50 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition resize-none"
                    placeholder="Aggiungi note sull'utente..."
                  />
                </div>

                {/* Info Sistema */}
                <div className="rounded-xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6 md:col-span-2">
                  <h3 className="text-lg font-semibold text-white mb-4">Informazioni Sistema</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-muted-2">Data Iscrizione</label>
                      <p className="mt-1 text-sm text-white">
                        {new Date(viewingUser.created_at).toLocaleDateString("it-IT", { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-2">Email</label>
                      <p className="mt-1 text-sm text-white break-all">{viewingUser.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setViewingUser(null)}
                  className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 hover:border-white/30"
                >
                  Chiudi
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from("profiles")
                        .update({ 
                          full_name: viewingUser.full_name,
                          phone: viewingUser.phone,
                          date_of_birth: viewingUser.date_of_birth,
                          address: viewingUser.address,
                          city: viewingUser.city,
                          postal_code: viewingUser.postal_code,
                          notes: viewingUser.notes,
                          role: viewingUser.role 
                        })
                        .eq("id", viewingUser.id);

                      if (error) throw error;
                      setViewingUser(null);
                      loadUsers();
                    } catch (err: any) {
                      alert(`Errore: ${err.message}`);
                    }
                  }}
                  disabled={currentUserRole === "gestore" && viewingUser.role === "admin"}
                  className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06101f] transition hover:bg-[#5fc7e0] hover:shadow-lg hover:shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-[#2f7de1]/30 bg-[#0d1f35]/98 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 ring-2 ring-accent/30">
                  <Edit2 className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Modifica Utente</h2>
                  <p className="text-sm text-muted">Aggiorna le informazioni dell'utente</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <span className="block text-xs font-medium text-muted-2 mb-1">Email</span>
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-accent" />
                    {editingUser.email}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-white">Nome Completo</span>
                  <input
                    type="text"
                    value={editingUser.full_name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#1a3d5c]/60 px-4 py-3 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                    placeholder="Mario Rossi"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-white">Ruolo</span>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full rounded-lg border border-white/15 bg-[#1a3d5c]/60 px-4 py-3 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                    disabled={currentUserRole === "gestore" && editingUser.role === "admin"}
                  >
                    <option value="atleta">Atleta</option>
                    <option value="maestro">Coach</option>
                    <option value="gestore">Gestore</option>
                    {currentUserRole === "admin" && <option value="admin">Admin</option>}
                  </select>
                  {currentUserRole === "gestore" && editingUser.role === "admin" && (
                    <span className="mt-2 block text-xs text-yellow-400 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Non puoi modificare utenti admin
                    </span>
                  )}
                </label>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 hover:border-white/30"
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
                  className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06101f] transition hover:bg-[#5fc7e0] hover:shadow-lg hover:shadow-accent/20"
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-[#2f7de1]/30 bg-[#0d1f35]/98 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 ring-2 ring-accent/30">
                  <Plus className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Crea Nuovo Utente</h2>
                  <p className="text-sm text-muted">Aggiungi un nuovo utente al sistema</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-white">Email *</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#1a3d5c]/60 px-4 py-3 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                    placeholder="email@esempio.it"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-white">Password *</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-lg border border-white/15 bg-[#1a3d5c]/60 px-4 py-3 pr-12 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-2 transition hover:bg-white/5 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="mt-2 block text-xs text-muted-2">Minimo 6 caratteri</span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-white">Nome Completo</span>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#1a3d5c]/60 px-4 py-3 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                    placeholder="Mario Rossi"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-white">Ruolo</span>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full rounded-lg border border-white/15 bg-[#1a3d5c]/60 px-4 py-3 text-sm text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
                  >
                    <option value="atleta">Atleta</option>
                    <option value="maestro">Coach</option>
                    <option value="gestore">Gestore</option>
                    {currentUserRole === "admin" && <option value="admin">Admin</option>}
                  </select>
                  {currentUserRole === "gestore" && (
                    <span className="mt-2 block text-xs text-yellow-400 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Solo gli admin possono creare altri admin
                    </span>
                  )}
                </label>

                {formError && (
                  <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4">
                    <p className="text-sm text-red-200 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-400/20">!</span>
                      {formError}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ email: "", password: "", full_name: "", role: "atleta" });
                    setFormError("");
                  }}
                  className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5 hover:border-white/30"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={formLoading}
                  className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-[#06101f] transition hover:bg-[#5fc7e0] hover:shadow-lg hover:shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creazione...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Plus className="h-4 w-4" />
                      Crea Utente
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
