"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Loader2,
  User,
  Dumbbell,
  Home,
  Crown,
  Upload,
  Link as LinkIcon,
  X,
} from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  avatar_url: string | null;
  birth_date?: string | null;
  date_of_birth?: string | null;
  bio: string | null;
  created_at: string;
  metadata?: {
    birth_city?: string;
    fiscal_code?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  } | null;
};

export default function AthleteProfileEditPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    birth_date: "",
    birth_city: "",
    fiscal_code: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    notes: "",
  });

  const roleLabels = {
    admin: { label: "Admin", icon: Crown, bgColor: "#023047", borderLeftColor: "#011a24" },
    gestore: { label: "Gestore", icon: Home, bgColor: "#023047", borderLeftColor: "#011a24" },
    maestro: { label: "Maestro", icon: Dumbbell, bgColor: "#05384c", borderLeftColor: "#022431" },
    atleta: { label: "Atleta", icon: User, bgColor: "var(--secondary)", borderLeftColor: "#023047" },
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error || !data) {
        alert("Profilo non trovato");
        router.push("/dashboard/atleta/profile");
        return;
      }

      setUser(data);
      const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        birth_date: data.birth_date || data.date_of_birth || "",
        birth_city: metadata.birth_city || "",
        fiscal_code: metadata.fiscal_code || "",
        address: metadata.address || "",
        city: metadata.city || "",
        province: metadata.province || "",
        postal_code: metadata.postal_code || "",
        notes: data.bio || "",
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      alert("Errore nel caricamento del profilo");
      router.push("/dashboard/atleta/profile");
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    try {
      const existingMetadata = user.metadata && typeof user.metadata === "object"
        ? user.metadata
        : {};

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name || null,
          phone: formData.phone || null,
          birth_date: formData.birth_date || null,
          bio: formData.notes || null,
          metadata: {
            ...(existingMetadata as Record<string, unknown>),
            birth_city: formData.birth_city || "",
            fiscal_code: formData.fiscal_code || "",
            address: formData.address || "",
            city: formData.city || "",
            province: formData.province || "",
            postal_code: formData.postal_code || "",
          },
        })
        .eq("id", user.id);

      if (error) throw error;

      router.push("/dashboard/atleta/profile");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      alert(err?.message || "Errore durante il salvataggio del profilo");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("L'immagine deve essere inferiore a 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Il file deve essere un'immagine");
      return;
    }

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      if (user.avatar_url) {
        uploadFormData.append("oldImageUrl", user.avatar_url);
      }

      const uploadResponse = await fetch("/api/upload/staff-image", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadPayload?.url) {
        throw new Error(uploadPayload?.error || "Errore durante l'upload dell'immagine");
      }

      const publicUrl = uploadPayload.url as string;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: publicUrl });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Errore durante l'upload dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAvatarUrl() {
    if (!avatarUrl || !user) return;

    try {
      new URL(avatarUrl);
    } catch {
      alert("Inserisci un URL valido");
      return;
    }

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: avatarUrl });
      setAvatarUrl("");
    } catch (error) {
      console.error("Error updating avatar:", error);
      alert("Errore durante l'aggiornamento dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user?.avatar_url) return;

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      const deleteFormData = new FormData();
      deleteFormData.append("deleteOnly", "true");
      deleteFormData.append("oldImageUrl", user.avatar_url);

      const deleteResponse = await fetch("/api/upload/staff-image", {
        method: "POST",
        body: deleteFormData,
      });

      const deletePayload = await deleteResponse.json().catch(() => ({}));
      if (!deleteResponse.ok) {
        throw new Error(deletePayload?.error || "Errore durante l'eliminazione dell'immagine");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: null });
      setAvatarUrl("");
    } catch (error) {
      console.error("Error removing avatar:", error);
      alert("Errore durante la rimozione dell'avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleResetPassword() {
    if (!user) return;

    if (!confirm(`Vuoi inviare l'email di reset password a ${user.email}?`)) return;

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      alert("Email di reset password inviata con successo.");
    } catch (err: any) {
      console.error("Error resetting password:", err);
      alert(err?.message || "Errore durante l'invio del reset password");
    } finally {
      setResettingPassword(false);
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento profilo...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const RoleIcon = roleLabels[user.role].icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <p className="breadcrumb text-secondary/60 mb-1">
            <Link href="/dashboard/atleta/profile" className="hover:text-secondary/80 transition-colors">
              Profilo Utente
            </Link>
            {" › "}
            <span>Modifica Profilo</span>
          </p>
          <h1 className="text-4xl font-bold text-secondary">Modifica Profilo</h1>
        </div>
      </div>

      <div
        className="rounded-xl border-t border-r border-b p-6 border-l-4 transition-all"
        style={{
          backgroundColor: roleLabels[user.role].bgColor,
          borderColor: roleLabels[user.role].bgColor,
          borderLeftColor: roleLabels[user.role].borderLeftColor,
        }}
      >
        <div className="flex items-start gap-6">
          <RoleIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {formData.full_name || user.full_name || "Nome non impostato"}
            </h2>
          </div>
        </div>
      </div>

      <form onSubmit={updateProfile} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Dati Profilo</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Nome Completo</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Mario Rossi"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                <div className="flex-1">
                  <input
                    type="email"
                    value={user.email}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                <div className="flex-1">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="+39 123 456 7890"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data di Nascita</label>
                <div className="flex-1">
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Citta di Nascita</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.birth_city}
                    onChange={(e) => setFormData({ ...formData, birth_city: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Roma"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Codice Fiscale</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.fiscal_code}
                    onChange={(e) => setFormData({ ...formData, fiscal_code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 uppercase"
                    placeholder="RSSMRA80A01H501U"
                    maxLength={16}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Indirizzo</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Via Roma, 123"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Citta / Provincia / CAP</label>
                <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Milano"
                  />
                  <div className="flex gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value.toUpperCase() })}
                      className="w-20 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 uppercase text-center"
                      placeholder="MI"
                      maxLength={2}
                    />
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-24 sm:w-28 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                      placeholder="20100"
                      maxLength={5}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Note</label>
                <div className="flex-1">
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Eventuali note..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                  />
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
            <div className="flex flex-col items-start gap-4">
              <div className="w-80 h-80 rounded-xl bg-secondary/10 overflow-hidden flex items-center justify-center border border-gray-200 flex-shrink-0">
                {uploadingAvatar ? (
                  <Loader2 className="h-7 w-7 animate-spin text-secondary" />
                ) : user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name || "Avatar"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-bold text-secondary">
                    {getInitials(user.full_name, user.email)}
                  </span>
                )}
              </div>
              <div className={`w-80 ${user.avatar_url ? "flex items-center gap-2" : ""}`}>
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  disabled={uploadingAvatar}
                  className={`h-12 px-4 text-sm font-medium text-white bg-secondary border border-secondary rounded-lg hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    user.avatar_url ? "flex-1" : "w-full"
                  }`}
                >
                  Cambia Avatar
                </button>
                {user.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    aria-label="Elimina avatar"
                    className="h-12 w-12 inline-flex items-center justify-center text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Info Sistema</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">ID Utente</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={user.id}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Ruolo</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={roleLabels[user.role].label}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data Registrazione</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={new Date(user.created_at).toLocaleDateString("it-IT", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resettingPassword}
            className="flex-1 min-w-[140px] px-8 py-4 text-base font-semibold text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resettingPassword ? "Invio..." : "Reset Password"}
          </button>

          <button
            type="submit"
            disabled={updating}
            className="flex-1 min-w-[140px] px-8 py-4 text-base font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {updating ? "Salvataggio..." : "Salva Modifiche"}
          </button>
        </div>
      </form>

      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-secondary rounded-t-xl">
              <h3 className="text-xl font-bold text-white">Cambia Avatar</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white/80" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Carica un'immagine</label>
                <button
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary transition-all"
                >
                  <Upload className="h-5 w-5" />
                  Scegli File
                </button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">Massimo 5MB - Formati: JPG, PNG, GIF</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 font-medium">oppure</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Inserisci URL immagine</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://esempio.com/immagine.jpg"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    onKeyDown={(e) => e.key === "Enter" && handleAvatarUrl()}
                  />
                  <button
                    onClick={handleAvatarUrl}
                    disabled={!avatarUrl}
                    className="px-4 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Incolla l'URL di un'immagine gia caricata online</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
