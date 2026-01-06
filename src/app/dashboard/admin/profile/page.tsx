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
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  subscription_type: string | null;
  phone?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    birth_date: "",
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
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        birth_date: data.birth_date || "",
        bio: data.bio || "",
      });
    }

    setLoading(false);
  }

  async function saveProfile() {
    if (!profile) return;
    
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        bio: formData.bio || null,
      })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, ...formData });
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Il Mio Profilo</h1>
        <p className="text-sm text-gray-600">
          Gestisci le tue informazioni personali
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="relative bg-secondary h-40">
          <div className="absolute top-4 right-4">
            <span className="px-4 py-2 text-sm font-bold rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30">
              {getRoleLabel(profile.role)}
            </span>
          </div>
        </div>
        
        <div className="px-6 pb-6 -mt-16">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "Avatar"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {getInitials(profile.full_name, profile.email)}
                    </span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowAvatarModal(true)}
                disabled={uploadingAvatar}
                className="absolute bottom-2 right-2 p-2.5 rounded-full bg-secondary text-white hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {profile.full_name || "Nome non impostato"}
            </h2>
            <p className="text-gray-600 font-medium">{profile.email}</p>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-secondary" />
          Informazioni Account
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Mail className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Email</p>
              <p className="text-sm font-semibold text-gray-900">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Calendar className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Membro dal</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(profile.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Abbonamento</p>
              <p className="text-sm font-semibold text-gray-900">
                {profile.subscription_type || "Nessuno"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <User className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Ruolo</p>
              <p className="text-sm font-semibold text-gray-900">{getRoleLabel(profile.role)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="h-5 w-5 text-secondary" />
          Dati Personali
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Mario Rossi"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+39 123 456 7890"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data di Nascita
            </label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              placeholder="Scrivi qualcosa su di te..."
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary resize-none"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/90 transition-all disabled:opacity-50"
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
