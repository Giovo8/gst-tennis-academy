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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <div className="space-y-6" style={{ color: '#111827' }}>
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
    <div className="space-y-6" style={{ color: '#111827' }}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-black mb-2">Il Mio Profilo</h1>
        <p className="text-gray-800 font-medium" style={{ color: '#1f2937' }}>
          Gestisci le tue informazioni personali
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="relative bg-gradient-to-r from-cyan-500 to-blue-600 h-40">
          {/* Badge Ruolo */}
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
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {getInitials(profile.full_name, profile.email)}
                    </span>
                  </div>
                )}
              </div>
              <button className="absolute bottom-2 right-2 p-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg">
                <Camera className="h-4 w-4" />
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
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Shield className="h-5 w-5 text-blue-600" />
          Informazioni Account
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
              <p className="text-sm font-semibold text-gray-900">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Calendar className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Membro dal</p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(profile.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Abbonamento</p>
              <p className="text-sm font-semibold text-gray-900">
                {profile.subscription_type || "Nessuno"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="p-2 bg-purple-50 rounded-lg">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ruolo</p>
              <p className="text-sm font-semibold text-gray-900">{getRoleLabel(profile.role)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-wider">
          <User className="h-5 w-5 text-blue-600" />
          Dati Personali
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Mario Rossi"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Telefono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+39 123 456 7890"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Data di Nascita
            </label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              placeholder="Scrivi qualcosa su di te..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg disabled:shadow-none"
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
  );
}
