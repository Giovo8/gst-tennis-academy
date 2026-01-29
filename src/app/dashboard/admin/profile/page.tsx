"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Camera,
  Save,
  Loader2,
  Check,
  Shield,
  CreditCard,
  Upload,
  Link as LinkIcon,
  X,
  MapPin,
  FileText,
  Trophy,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription_type: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  metadata?: {
    birth_city?: string;
    fiscal_code?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  };
}

interface ArenaStats {
  points: number;
  level: string;
  wins: number;
  losses: number;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    date_of_birth: "",
    birth_city: "",
    fiscal_code: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    bio: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      const metadata = data.metadata || {};
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        date_of_birth: data.date_of_birth || "",
        birth_city: metadata.birth_city || "",
        fiscal_code: metadata.fiscal_code || "",
        address: metadata.address || "",
        city: metadata.city || "",
        province: metadata.province || "",
        postal_code: metadata.postal_code || "",
        bio: data.bio || "",
      });
    }

    // Load arena stats
    const { data: statsData } = await supabase
      .from("arena_stats")
      .select("points, level, wins, losses")
      .eq("user_id", user.id)
      .single();

    if (statsData) {
      setArenaStats(statsData);
    }

    setLoading(false);
  }

  async function saveProfile() {
    if (!profile) return;
    
    setSaving(true);

    const metadata = {
      ...(profile.metadata || {}),
      birth_city: formData.birth_city || undefined,
      fiscal_code: formData.fiscal_code || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      province: formData.province || undefined,
      postal_code: formData.postal_code || undefined,
    };

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        date_of_birth: formData.date_of_birth || null,
        bio: formData.bio || null,
        metadata,
      })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, ...formData, metadata });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }

    setSaving(false);
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

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
      if (profile.avatar_url && profile.avatar_url.includes("/avatars/")) {
        const oldPath = profile.avatar_url.split("/avatars/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Errore durante l'upload dell'immagine");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Update error:", updateError);
        alert("Errore durante l'aggiornamento del profilo");
        return;
      }

      setProfile({ ...profile, avatar_url: publicUrl });
      
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Errore durante l'upload dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAvatarUrl() {
    if (!avatarUrl || !profile) return;

    try {
      new URL(avatarUrl);
    } catch {
      alert("Inserisci un URL valido");
      return;
    }

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      if (profile.avatar_url && profile.avatar_url.includes("/avatars/")) {
        const oldPath = profile.avatar_url.split("/avatars/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Update error:", updateError);
        alert("Errore durante l'aggiornamento del profilo");
        return;
      }

      setProfile({ ...profile, avatar_url: avatarUrl });
      setAvatarUrl("");
      
    } catch (error) {
      console.error("Error updating avatar:", error);
      alert("Errore durante l'aggiornamento dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getRankLabel(level: string) {
    const labels: Record<string, string> = {
      bronze: "Bronzo",
      silver: "Argento",
      gold: "Oro",
      platinum: "Platino",
      diamond: "Diamante",
    };
    return labels[level] || level;
  }

  function getRankColor(level: string) {
    const colors: Record<string, string> = {
      bronze: "bg-orange-100 text-orange-700 border-orange-200",
      silver: "bg-gray-100 text-gray-700 border-gray-300",
      gold: "bg-yellow-100 text-yellow-700 border-yellow-300",
      platinum: "bg-cyan-100 text-cyan-700 border-cyan-300",
      diamond: "bg-blue-100 text-blue-700 border-blue-300",
    };
    return colors[level] || "bg-gray-100 text-gray-700 border-gray-200";
  }

  function getRoleLabel(role: string) {
    const labels: Record<string, string> = {
      atleta: "Atleta",
      maestro: "Maestro",
      gestore: "Gestore",
      admin: "Amministratore",
    };
    return labels[role] || role;
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded-lg w-48 animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">Profilo non trovato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-secondary mb-2">Il Mio Profilo</h1>
        <p className="text-sm text-secondary/70">
          Gestisci le tue informazioni personali
        </p>
      </div>

      {/* Profile Card */}
      <div className={`bg-white rounded-xl border border-gray-200 border-l-4 p-4 sm:p-6 ${
        profile.role === "admin" ? "border-l-red-500" :
        profile.role === "gestore" ? "border-l-purple-500" :
        profile.role === "maestro" ? "border-l-blue-500" :
        "border-l-secondary"
      }`}>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {getInitials(profile.full_name, profile.email)}
                </span>
              )}
            </div>
            <button 
              onClick={() => setShowAvatarModal(true)}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 p-2 rounded-lg bg-secondary text-white hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-secondary mb-1">
              {profile.full_name || "Nome non impostato"}
            </h2>
            <p className="text-secondary/70 text-sm font-medium mb-2">{profile.email}</p>
            <span className="inline-block px-3 py-1 text-xs font-bold rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
              {getRoleLabel(profile.role)}
            </span>
          </div>
        </div>
      </div>

      {/* Sezione 1: Dati Anagrafici */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-secondary mb-6 pb-4 border-b border-gray-200 flex items-center gap-2">
          <User className="h-5 w-5" />
          Dati Anagrafici
        </h3>

        <div className="space-y-6">
          {/* Nome Completo */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Nome Completo
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Mario Rossi"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Email
            </label>
            <div className="flex-1">
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-secondary/70 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Telefono */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Telefono
            </label>
            <div className="flex-1">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+39 123 456 7890"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          {/* Data di Nascita */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Data di Nascita
            </label>
            <div className="flex-1">
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          {/* Città di Nascita */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Città di Nascita
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={formData.birth_city}
                onChange={(e) => setFormData({ ...formData, birth_city: e.target.value })}
                placeholder="Roma"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          {/* Codice Fiscale */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Codice Fiscale
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={formData.fiscal_code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().slice(0, 16);
                  setFormData({ ...formData, fiscal_code: value });
                }}
                placeholder="RSSMRA80A01H501Z"
                maxLength={16}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary uppercase"
              />
            </div>
          </div>

          {/* Indirizzo */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Indirizzo
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Via Roma 123"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>
          </div>

          {/* Città, Provincia, CAP */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Città, Provincia, CAP
            </label>
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Roma"
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().slice(0, 2);
                    setFormData({ ...formData, province: value });
                  }}
                  placeholder="RM"
                  maxLength={2}
                  className="w-20 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary uppercase text-center"
                />
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setFormData({ ...formData, postal_code: value });
                  }}
                  placeholder="00100"
                  maxLength={5}
                  className="flex-1 sm:w-28 sm:flex-none px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Note
            </label>
            <div className="flex-1">
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="Note aggiuntive..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary resize-none"
              />
            </div>
          </div>

          {/* Pulsante Salva */}
          <div className="pt-4">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/90 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Salvataggio...
                </>
              ) : saved ? (
                <>
                  <Check className="h-5 w-5" />
                  Salvato!
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Salva Modifiche
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sezione 2: Info Sistema */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-secondary mb-6 pb-4 border-b border-gray-200 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Info Sistema
        </h3>

        <div className="space-y-6">
          {/* ID Utente */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              ID Utente
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={profile.id}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-secondary/70 cursor-not-allowed font-mono text-sm"
              />
            </div>
          </div>

          {/* Data Registrazione */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Data Registrazione
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={formatDate(profile.created_at)}
                disabled
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-secondary/70 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Ruolo */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Ruolo
            </label>
            <div className="flex-1">
              <div className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-secondary/70 font-medium">
                {getRoleLabel(profile.role)}
              </div>
            </div>
          </div>

          {/* Arena Stats */}
          {arenaStats && (
            <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Statistiche Arena
              </label>
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-secondary" />
                      <span className="text-xs font-medium text-secondary/70">Rank</span>
                    </div>
                    <span className={`inline-block px-3 py-1 text-sm font-bold rounded-lg border ${getRankColor(arenaStats.level)}`}>
                      {getRankLabel(arenaStats.level)}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-secondary/70 mb-1">Punti</div>
                    <div className="text-2xl font-bold text-secondary">{arenaStats.points}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-secondary/70 mb-1">Vittorie</div>
                    <div className="text-2xl font-bold text-green-600">{arenaStats.wins}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-secondary/70 mb-1">Sconfitte</div>
                    <div className="text-2xl font-bold text-red-600">{arenaStats.losses}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tipo Abbonamento */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Tipo Abbonamento
            </label>
            <div className="flex-1">
              <div className="px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-secondary/70 font-medium">
                {profile.subscription_type || "Nessuno"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Cambia Avatar</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Upload File */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Carica un'immagine
                </label>
                <button
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/90 transition-all"
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
                <p className="text-xs text-gray-500 mt-2">
                  Massimo 5MB - Formati: JPG, PNG, GIF
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 font-medium">oppure</span>
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Inserisci URL immagine
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://esempio.com/immagine.jpg"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                    onKeyDown={(e) => e.key === 'Enter' && handleAvatarUrl()}
                  />
                  <button
                    onClick={handleAvatarUrl}
                    disabled={!avatarUrl}
                    className="px-4 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Incolla l'URL di un'immagine già caricata online
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
