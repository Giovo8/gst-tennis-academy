"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  User,
  Crown,
  Dumbbell,
  Home,
  Upload,
  Link as LinkIcon,
  X,
} from "lucide-react";

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  date_of_birth?: string | null;
  birth_date?: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  metadata: {
    birth_city?: string;
    fiscal_code?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    certificato_medico_url?: string;
    certificato_medico_scadenza?: string;
    tesserato?: string;
    tesserato_scadenza?: string;
    numero_tessera?: string;
  } | null;
};

type ArenaStats = {
  level: string;
};

type AthleteProfilePageProps = {
  profileEditPath?: string;
};

export default function AthleteProfilePage({
  profileEditPath = "/dashboard/atleta/profile/modifica",
}: AthleteProfilePageProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    void loadUserProfile();
  }, []);

  async function loadUserProfile() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setError("Utente non autenticato");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError) throw profileError;

      setUser(profileData);

      const { data: arenaData } = await supabase
        .from("arena_stats")
        .select("level")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (arenaData) {
        setArenaStats(arenaData);
      }
    } catch (err: unknown) {
      console.error("Error loading profile:", err);
      setError(err instanceof Error ? err.message : "Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!user) return;

    if (!confirm(`Vuoi inviare l'email di reset password a ${user.email}?`)) return;

    setResettingPassword(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) throw resetError;

      toast.success("Email di reset password inviata con successo.");
    } catch (err: unknown) {
      console.error("Error resetting password:", err);
      toast.error(err instanceof Error ? err.message : "Errore durante l'invio del reset password");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.warning("L'immagine deve essere inferiore a 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.warning("Il file deve essere un'immagine");
      return;
    }

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("targetUserId", user.id);
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
      toast.error("Errore durante l'upload dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAvatarUrl() {
    if (!avatarUrl || !user) return;

    try {
      new URL(avatarUrl);
    } catch {
      toast.warning("Inserisci un URL valido");
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
      toast.error("Errore durante l'aggiornamento dell'immagine");
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
      deleteFormData.append("targetUserId", user.id);
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
      toast.error("Errore durante la rimozione dell'avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  const roleLabels = {
    admin: {
      label: "Admin",
      icon: Crown,
      bgColor: "#023047",
      borderLeftColor: "#011a24",
    },
    gestore: {
      label: "Gestore",
      icon: Home,
      bgColor: "#023047",
      borderLeftColor: "#011a24",
    },
    maestro: {
      label: "Maestro",
      icon: Dumbbell,
      bgColor: "#05384c",
      borderLeftColor: "#022431",
    },
    atleta: {
      label: "Atleta",
      icon: User,
      bgColor: "var(--secondary)",
      borderLeftColor: "#023047",
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6 pt-3">
        <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error || "Utente non trovato"}</p>
          </div>
        </div>
      </div>
    );
  }

  const roleInfo = roleLabels[user.role];
  const RoleIcon = roleInfo.icon;
  const dateOfBirth = user.date_of_birth || user.birth_date;
  const formatOptionalDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString("it-IT") : "-";
  const sectionCardClassName = "bg-white rounded-lg border border-black/10 overflow-hidden h-full";
  const sectionCardHeaderClassName =
    "px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent";

  return (
    <div className="space-y-6 pt-3">
      <h1 className="text-4xl font-bold text-secondary">Profilo Utente</h1>

      <div
        className="rounded-lg border border-black/10 p-6"
        style={{
          backgroundColor: roleInfo.bgColor,
        }}
      >
        <div className="flex items-start gap-6">
          <RoleIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {user.full_name || "Nome non impostato"}
            </h2>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:auto-rows-min lg:items-stretch">
        <div className={`${sectionCardClassName} flex flex-col lg:col-start-2 lg:row-start-1`}>
          <div className={sectionCardHeaderClassName}>
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Avatar</h2>
          </div>
          <div className="flex flex-1 p-6">
            <div className="relative w-full rounded-xl bg-secondary/10 overflow-hidden flex-1 border border-gray-200 lg:min-h-[360px]">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || "Avatar"}
                  className="block w-full h-auto object-cover lg:absolute lg:inset-0 lg:h-full lg:w-full"
                />
              ) : (
                <div className="flex min-h-[260px] items-center justify-center lg:absolute lg:inset-0 lg:min-h-0">
                  <User className="h-40 w-40 text-secondary" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`${sectionCardClassName} lg:col-start-1 lg:row-start-1`}>
          <div className={sectionCardHeaderClassName}>
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Utente</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Nome Completo</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.full_name || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data di Nascita</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString("it-IT") : "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Citta di Nascita</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.metadata?.birth_city || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Indirizzo</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.metadata?.address || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Citta / Provincia / CAP</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {[user.metadata?.city, user.metadata?.province, user.metadata?.postal_code]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Codice Fiscale</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold font-mono">{user.metadata?.fiscal_code || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.phone || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold break-all">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`${sectionCardClassName} lg:col-start-1 lg:row-start-2`}>
          <div className={sectionCardHeaderClassName}>
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Account</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Data Registrazione</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {new Date(user.created_at).toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">ID Utente</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold break-all">{user.id}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Ruolo</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{roleInfo.label}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Rank Arena</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{arenaStats?.level || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`${sectionCardClassName} lg:col-start-2 lg:row-start-2`}>
          <div className={sectionCardHeaderClassName}>
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Corsi</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Certificato Medico</label>
                <div className="flex-1">
                  {user.metadata?.certificato_medico_url ? (
                    <a
                      href={user.metadata.certificato_medico_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center h-12 px-4 text-sm font-medium text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all"
                    >
                      Visualizza PDF
                    </a>
                  ) : (
                    <p className="text-secondary font-semibold">-</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Scadenza Certificato</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {formatOptionalDate(user.metadata?.certificato_medico_scadenza)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Tesserato</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.metadata?.tesserato || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Numero Tessera</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">{user.metadata?.numero_tessera || "-"}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
                <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">Scadenza Tesseramento</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {formatOptionalDate(user.metadata?.tesserato_scadenza)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.bio && user.bio.trim() ? (
        <div className={`${sectionCardClassName} lg:col-span-2`}>
          <div className={sectionCardHeaderClassName}>
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Note</h2>
          </div>
          <div className="px-6 py-6">
            <p className="text-secondary whitespace-pre-wrap">{user.bio}</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={profileEditPath}
          className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
        >
          Modifica Profilo
        </Link>
        <button
          type="button"
          onClick={() => setShowAvatarModal(true)}
          className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-[#075985] rounded-lg hover:bg-[#075985]/90 transition-all font-medium"
        >
          Cambia Avatar
        </button>
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={resettingPassword}
          className="flex-1 min-w-[140px] flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resettingPassword ? "Invio..." : "Reset Password"}
        </button>
      </div>

      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-secondary px-4 py-3">
              <h3 className="text-xl font-bold text-white">Cambia Avatar</h3>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="rounded-lg p-1 transition-colors hover:bg-white/10"
              >
                <X className="h-5 w-5 text-white/80" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">Carica un&apos;immagine</label>
                <button
                  type="button"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 font-semibold text-white transition-all hover:bg-secondary/90"
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
                <p className="mt-2 text-xs text-gray-500">Massimo 5MB - Formati: JPG, PNG, GIF</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 font-medium text-gray-500">oppure</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">Inserisci URL immagine</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://esempio.com/immagine.jpg"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary"
                    onKeyDown={(e) => e.key === "Enter" && handleAvatarUrl()}
                  />
                  <button
                    type="button"
                    onClick={handleAvatarUrl}
                    disabled={!avatarUrl}
                    className="rounded-xl bg-secondary px-4 py-3 font-semibold text-white transition-all hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Incolla l&apos;URL di un&apos;immagine gia caricata online</p>
              </div>

              {user.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="w-full rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Rimuovi Avatar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
