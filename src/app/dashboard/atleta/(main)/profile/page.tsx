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
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="h-64 skeleton rounded-xl" />
        <div className="h-96 skeleton rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--foreground-muted)]">Profilo non trovato</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Il Mio Profilo</h1>
        <p className="text-[var(--foreground-muted)] mt-1">
          Gestisci le tue informazioni personali
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] h-24" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-[var(--surface)] border-4 border-[var(--surface)] flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "Avatar"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-[var(--primary)]">
                    {getInitials(profile.full_name, profile.email)}
                  </span>
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                {profile.full_name || "Nome non impostato"}
              </h2>
              <p className="text-[var(--foreground-muted)]">{profile.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                {getRoleLabel(profile.role)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--primary)]" />
          Informazioni Account
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)]">
            <Mail className="h-5 w-5 text-[var(--foreground-muted)]" />
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Email</p>
              <p className="text-sm text-[var(--foreground)]">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)]">
            <Calendar className="h-5 w-5 text-[var(--foreground-muted)]" />
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Membro dal</p>
              <p className="text-sm text-[var(--foreground)]">{formatDate(profile.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)]">
            <CreditCard className="h-5 w-5 text-[var(--foreground-muted)]" />
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Abbonamento</p>
              <p className="text-sm text-[var(--foreground)]">
                {profile.subscription_type || "Nessuno"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-hover)]">
            <User className="h-5 w-5 text-[var(--foreground-muted)]" />
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Ruolo</p>
              <p className="text-sm text-[var(--foreground)]">{getRoleLabel(profile.role)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-[var(--primary)]" />
          Dati Personali
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Mario Rossi"
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Telefono
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+39 123 456 7890"
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Data di Nascita
            </label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              placeholder="Scrivi qualcosa su di te..."
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50"
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
