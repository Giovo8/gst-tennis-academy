"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDestinationForRole, type UserRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase/client";
import { User, CreditCard, LogOut, Shield, Mail, Bell } from "lucide-react";

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
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 sm:gap-5 px-4 sm:px-6 py-6 sm:py-10 bg-frozen-950 text-white">
      <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-2">
            <User className="inline h-4 w-4 mr-2" />
            Profilo
          </p>
          <h1 className="text-3xl font-semibold text-white">Il tuo Account</h1>
          <p className="text-sm text-muted">
            Gestisci i tuoi dati personali e abbonamento
          </p>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-4 py-2 text-xs font-semibold text-accent flex items-center gap-2">
              <Shield className="h-3 w-3" />
              {profile.role.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-frozen-500/30 bg-frozen-800/60 p-6">
        {loading ? (
          <p className="text-sm text-[#c6d8c9]">Caricamento profilo...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-[#c6d8c9] sm:col-span-2">
                Nome completo
                <input
                  className="mt-2 w-full rounded-xl border border-white/15 bg-frozen-800/60 px-3 py-2 text-white outline-none focus:border-frozen-400/60"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome e Cognome"
                />
              </label>
              <label className="block text-sm text-[#c6d8c9]">
                Email
                <input
                  className="mt-2 w-full rounded-xl border border-white/15 bg-frozen-800/60 px-3 py-2 text-white opacity-70"
                  value={profile?.email ?? ""}
                  readOnly
                />
              </label>
              <label className="block text-sm text-[#c6d8c9]">
                Abbonamento
                <input
                  className="mt-2 w-full rounded-xl border border-white/15 bg-frozen-800/60 px-3 py-2 text-white outline-none focus:border-frozen-400/60"
                  value={subscriptionType}
                  onChange={(e) => setSubscriptionType(e.target.value)}
                  placeholder="Es. Mensile, Annuale, Clinic Pack"
                />
              </label>
            </div>

            {/* Notification Preferences */}
            <div className="rounded-2xl border border-frozen-500/20 bg-frozen-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-frozen-500/10 p-2">
                  <Bell className="h-5 w-5 text-frozen-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white mb-1">Preferenze Notifiche</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Gestisci come vuoi ricevere le notifiche importanti
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={emailNotificationsEnabled}
                        onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-frozen-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-frozen-500"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-frozen-400" />
                        <span className="text-sm font-medium text-white">Notifiche Email</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Ricevi email per prenotazioni, tornei e messaggi importanti
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-accent text-frozen-950 transition hover:bg-frozen-400 disabled:opacity-60"
              >
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </button>
              <button
                onClick={goToDashboard}
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
              >
                Vai alla dashboard
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 justify-center rounded-full border border-frozen-400/30 px-6 py-3 text-sm font-semibold text-frozen-300 transition hover:border-frozen-400/50 hover:bg-frozen-400/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>

            {error && (
              <p className="rounded-xl border border-frozen-400/30 bg-frozen-400/10 px-3 py-2 text-sm text-frozen-100">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-xl border border-frozen-400/30 bg-frozen-400/10 px-3 py-2 text-sm text-frozen-100">
                {success}
              </p>
            )}
          </div>
        )}
      </div>
      </div>
    </main>
  );
}

