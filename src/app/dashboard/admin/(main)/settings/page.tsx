"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Settings,
  Save,
  Loader2,
  Clock,
  Calendar,
  Euro,
  Bell,
  Mail,
  Shield,
  Check,
  Globe,
} from "lucide-react";

interface SystemSettings {
  // Booking settings
  booking_advance_days: number;
  booking_min_hours_before: number;
  booking_max_duration_hours: number;
  booking_price_per_hour: number;
  
  // Operating hours
  opening_hour: number;
  closing_hour: number;
  
  // Notifications
  notifications_email_enabled: boolean;
  notifications_push_enabled: boolean;
  
  // Maintenance
  maintenance_mode: boolean;
  maintenance_message: string;
  
  // Contact info
  contact_email: string;
  contact_phone: string;
  address: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    booking_advance_days: 7,
    booking_min_hours_before: 2,
    booking_max_duration_hours: 2,
    booking_price_per_hour: 20,
    opening_hour: 8,
    closing_hour: 22,
    notifications_email_enabled: true,
    notifications_push_enabled: false,
    maintenance_mode: false,
    maintenance_message: "",
    contact_email: "info@gst-tennis.it",
    contact_phone: "+39 02 1234567",
    address: "Via dello Sport 123, Milano",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"bookings" | "notifications" | "system" | "contact">("bookings");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    // Try to load from system_settings table
    const { data, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .limit(100);

    if (!error && data && data.length > 0) {
      const settingsObj: Partial<SystemSettings> = {};
      data.forEach(row => {
        (settingsObj as Record<string, unknown>)[row.key] = JSON.parse(row.value);
      });
      setSettings(prev => ({ ...prev, ...settingsObj }));
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);

    // Save each setting as a key-value pair
    const entries = Object.entries(settings);
    const promises = entries.map(([key, value]) =>
      supabase.from("system_settings").upsert(
        { key, value: JSON.stringify(value) },
        { onConflict: "key" }
      )
    );

    await Promise.all(promises);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const tabs = [
    { id: "bookings" as const, label: "Prenotazioni", icon: Calendar },
    { id: "notifications" as const, label: "Notifiche", icon: Bell },
    { id: "system" as const, label: "Sistema", icon: Shield },
    { id: "contact" as const, label: "Contatti", icon: Globe },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="h-96 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Impostazioni</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Configura il sistema della piattaforma
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50"
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        {activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <Calendar className="h-6 w-6 text-[var(--primary)]" />
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Impostazioni Prenotazioni</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Configura le regole per le prenotazioni dei campi
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Prenotazione anticipata (giorni)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.booking_advance_days}
                  onChange={(e) => setSettings({ ...settings, booking_advance_days: parseInt(e.target.value) || 7 })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Quanto in anticipo si può prenotare
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Preavviso minimo (ore)
                </label>
                <input
                  type="number"
                  min="0"
                  max="48"
                  value={settings.booking_min_hours_before}
                  onChange={(e) => setSettings({ ...settings, booking_min_hours_before: parseInt(e.target.value) || 2 })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Ore minime di anticipo per prenotare
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Durata massima (ore)
                </label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={settings.booking_max_duration_hours}
                  onChange={(e) => setSettings({ ...settings, booking_max_duration_hours: parseInt(e.target.value) || 2 })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Durata massima di una prenotazione
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  <Euro className="h-4 w-4 inline mr-1" />
                  Prezzo orario (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={settings.booking_price_per_hour}
                  onChange={(e) => setSettings({ ...settings, booking_price_per_hour: parseFloat(e.target.value) || 20 })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Prezzo base per ora di campo
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="font-medium text-[var(--foreground)] mb-4">Orari di Apertura</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Apertura
                  </label>
                  <select
                    value={settings.opening_hour}
                    onChange={(e) => setSettings({ ...settings, opening_hour: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Chiusura
                  </label>
                  <select
                    value={settings.closing_hour}
                    onChange={(e) => setSettings({ ...settings, closing_hour: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <Bell className="h-6 w-6 text-[var(--primary)]" />
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Notifiche</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Gestisci le impostazioni delle notifiche
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[var(--primary)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Notifiche Email</p>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Invia email per prenotazioni e promemoria
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications_email_enabled}
                    onChange={(e) => setSettings({ ...settings, notifications_email_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-[var(--primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-[var(--primary)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Notifiche Push</p>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Notifiche in tempo reale nel browser
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications_push_enabled}
                    onChange={(e) => setSettings({ ...settings, notifications_push_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-[var(--primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <Shield className="h-6 w-6 text-[var(--primary)]" />
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Sistema</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Impostazioni avanzate del sistema
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Modalità Manutenzione</p>
                    <p className="text-sm text-[var(--foreground-muted)]">
                      Blocca l&apos;accesso agli utenti per manutenzione
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-orange-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {settings.maintenance_mode && (
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Messaggio di Manutenzione
                  </label>
                  <textarea
                    value={settings.maintenance_message}
                    onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                    rows={3}
                    placeholder="Stiamo effettuando aggiornamenti. Torneremo presto online!"
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <Globe className="h-6 w-6 text-[var(--primary)]" />
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Informazioni di Contatto</h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Dati mostrati sul sito e nelle comunicazioni
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={settings.contact_phone}
                  onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Indirizzo
                </label>
                <textarea
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
