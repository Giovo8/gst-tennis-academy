"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Check, ArrowLeft, Crown, GraduationCap, Home, UserCheck } from "lucide-react";
import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  avatar_url: string | null;
  subscription_type: string | null;
  email_notifications_enabled: boolean;
  created_at: string;
};

export default function ModificaUtentePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "atleta" as "admin" | "gestore" | "maestro" | "atleta",
    subscription_type: "",
    email_notifications_enabled: true
  });

  const roleLabels = {
    admin: { label: "Admin", icon: Crown },
    gestore: { label: "Gestore", icon: Home },
    maestro: { label: "Maestro", icon: GraduationCap },
    atleta: { label: "Atleta", icon: UserCheck },
  };

  useEffect(() => {
    if (userId) {
      loadUser();
    } else {
      router.push("/dashboard/admin/users");
    }
  }, [userId]);

  async function loadUser() {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        alert("Utente non trovato");
        router.push("/dashboard/admin/users");
        return;
      }

      setUser(data);
      setFormData({
        full_name: data.full_name || "",
        email: data.email,
        phone: data.phone || "",
        role: data.role,
        subscription_type: data.subscription_type || "",
        email_notifications_enabled: data.email_notifications_enabled ?? true
      });
    } catch (error) {
      console.error("Error loading user:", error);
      alert("Errore nel caricamento dell'utente");
      router.push("/dashboard/admin/users");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.email || !formData.full_name) {
      alert("Email e Nome sono obbligatori");
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          email: formData.email.trim().toLowerCase(),
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          subscription_type: formData.subscription_type || null,
          email_notifications_enabled: formData.email_notifications_enabled
        })
        .eq("id", userId);

      if (error) throw error;

      alert("Profilo aggiornato con successo!");
      router.push("/dashboard/admin/users");
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert(error.message || "Errore durante l'aggiornamento del profilo");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento utente...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-secondary">Utente non trovato</p>
        <Link href="/dashboard/admin/users" className="text-secondary hover:underline mt-4 inline-block">
          Torna agli utenti
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/admin/users"
          className="text-xs font-bold text-secondary/60 uppercase tracking-wider hover:text-secondary transition-colors w-fit"
        >
          Gestione Utenti
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Modifica Utente
          </h1>
          <p className="text-secondary/70 font-medium">
            Aggiorna le informazioni dell'utente {user.full_name || user.email}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6">
        <form onSubmit={updateUser} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Completo */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Mario Rossi"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="email@esempio.com"
                required
              />
            </div>

            {/* Telefono */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Telefono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="+39 123 456 7890"
              />
            </div>

            {/* Ruolo */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Ruolo *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                required
              >
                {Object.entries(roleLabels).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo Abbonamento */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Tipo Abbonamento
              </label>
              <input
                type="text"
                value={formData.subscription_type}
                onChange={(e) => setFormData({ ...formData, subscription_type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-md bg-white text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Es. Mensile, Annuale, Clinic Pack"
              />
            </div>

            {/* Notifiche Email */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_notifications_enabled}
                  onChange={(e) => setFormData({ ...formData, email_notifications_enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-secondary/20 text-secondary focus:ring-secondary/20"
                />
                <div>
                  <div className="text-sm font-semibold text-secondary">Notifiche Email Abilitate</div>
                  <p className="text-xs text-secondary/60">L'utente riceverà email per prenotazioni, tornei e messaggi importanti</p>
                </div>
              </label>
            </div>
          </div>

          {/* Info utente */}
          <div className="pt-4 border-t border-secondary/10">
            <p className="text-sm text-secondary/60">
              <strong>ID Utente:</strong> {user.id}
            </p>
            <p className="text-sm text-secondary/60 mt-1">
              <strong>Data registrazione:</strong> {new Date(user.created_at).toLocaleDateString("it-IT")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <Link
              href="/dashboard/admin/users"
              className="px-6 py-2.5 text-sm font-medium text-secondary/70 bg-white rounded-md hover:bg-secondary/5 transition-all"
            >
              Annulla
            </Link>
            <button
              type="submit"
              disabled={updating}
              className="px-6 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Salva Modifiche
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
