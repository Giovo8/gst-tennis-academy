"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDestinationForRole, type UserRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase/client";
import { User, LogOut, Shield, Mail, Bell, Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type ProfileData = {
  full_name: string | null;
  email: string;
  role: UserRole;
  subscription_type: string | null;
  email_notifications_enabled?: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [subscriptionType, setSubscriptionType] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setError(null);
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, role, subscription_type, email_notifications_enabled")
        .eq("id", user.id)
        .single();

      if (profileError || !data) {
        setError("Non riesco a recuperare il profilo.");
        setLoading(false);
        return;
      }

      setProfile(data as ProfileData);
      setFullName(data.full_name ?? "");
      setSubscriptionType(data.subscription_type ?? "");
      setEmailNotificationsEnabled(data.email_notifications_enabled ?? true);
      setLoading(false);
    };

    void loadProfile();
  }, [router]);

  const handleSave = async () => {
    if (!profile || !userId) {
      setError("Sessione non valida.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        subscription_type: subscriptionType,
        email_notifications_enabled: emailNotificationsEnabled,
      })
      .eq("id", userId ?? "");

    if (updateError) {
      setError("Salvataggio non riuscito.");
      setSaving(false);
      return;
    }

    setSuccess("Profilo aggiornato.");
    setSaving(false);
  };

  const goToDashboard = () => {
    if (!profile) return;
    router.push(getDestinationForRole(profile.role));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          {profile && (
            <Link
              href={getDestinationForRole(profile.role)}
              className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1 hover:text-secondary/80 transition-colors"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Dashboard
            </Link>
          )}
          <h1 className="text-3xl font-bold text-secondary">Profilo</h1>
          <p className="text-secondary/70 text-sm mt-1">
            Gestisci i tuoi dati personali e le preferenze
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Errore</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Successo</p>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento profilo...</p>
        </div>
      ) : (
        <>
          {/* Profile Info Card */}
          <div className="bg-white rounded-xl p-6 space-y-6">
            {/* Role Badge */}
            {profile && (
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Shield className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary/60 uppercase tracking-wider font-semibold">Ruolo</p>
                    <p className="text-sm font-bold text-secondary">{profile.role.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Nome completo
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-secondary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome e Cognome"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-secondary/60 outline-none cursor-not-allowed"
                  value={profile?.email ?? ""}
                  readOnly
                />
                <p className="text-xs text-secondary/50 mt-1">L'email non può essere modificata</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Tipo abbonamento
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-secondary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  value={subscriptionType}
                  onChange={(e) => setSubscriptionType(e.target.value)}
                  placeholder="Es. Mensile, Annuale, Base"
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences Card */}
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Bell className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-secondary mb-1">Preferenze Notifiche</h3>
                <p className="text-xs text-secondary/60">
                  Gestisci come vuoi ricevere le notifiche
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={emailNotificationsEnabled}
                  onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-secondary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Mail className="h-4 w-4 text-secondary" />
                <div>
                  <span className="text-sm font-semibold text-secondary block">Notifiche Email</span>
                  <span className="text-xs text-secondary/60">
                    Ricevi email per prenotazioni e tornei
                  </span>
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold bg-secondary text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Salvataggio..." : "Salva modifiche"}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 justify-center rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-secondary transition hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

