"use client";

import { useState } from "react";
import { Settings, Save, Bell, Shield, Palette, Globe, Mail, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: "GST Tennis Academy",
    siteEmail: "info@gsttennis.it",
    allowRegistration: true,
    requireInviteCode: true,
    emailNotifications: true,
    pushNotifications: false,
    maintenanceMode: false,
    darkModeDefault: true,
  });

  async function handleSave() {
    setSaving(true);
    // Simula salvataggio
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  }

  const SettingToggle = ({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-white/10 last:border-0">
      <div>
        <h4 className="text-white font-medium">{label}</h4>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-14 h-8 rounded-full transition-colors ${
          checked ? "bg-gradient-to-r from-cyan-500 to-blue-500" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-transform ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Impostazioni
          </h1>
          <p className="text-gray-600">Configura le impostazioni del sistema</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salva Modifiche
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <Globe className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Generali</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Nome del sito</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Email del sito</label>
              <input
                type="email"
                value={settings.siteEmail}
                onChange={(e) => setSettings({ ...settings, siteEmail: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Sicurezza</h2>
          </div>
          <div>
            <SettingToggle
              label="Registrazione aperta"
              description="Permetti nuove registrazioni"
              checked={settings.allowRegistration}
              onChange={(value) => setSettings({ ...settings, allowRegistration: value })}
            />
            <SettingToggle
              label="Richiedi codice invito"
              description="Obbligatorio per la registrazione"
              checked={settings.requireInviteCode}
              onChange={(value) => setSettings({ ...settings, requireInviteCode: value })}
            />
            <SettingToggle
              label="Modalità manutenzione"
              description="Blocca l'accesso agli utenti"
              checked={settings.maintenanceMode}
              onChange={(value) => setSettings({ ...settings, maintenanceMode: value })}
            />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Notifiche</h2>
          </div>
          <div>
            <SettingToggle
              label="Notifiche email"
              description="Invia notifiche via email"
              checked={settings.emailNotifications}
              onChange={(value) => setSettings({ ...settings, emailNotifications: value })}
            />
            <SettingToggle
              label="Notifiche push"
              description="Invia notifiche push al browser"
              checked={settings.pushNotifications}
              onChange={(value) => setSettings({ ...settings, pushNotifications: value })}
            />
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <Palette className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Aspetto</h2>
          </div>
          <div>
            <SettingToggle
              label="Tema scuro di default"
              description="Usa il tema scuro per i nuovi utenti"
              checked={settings.darkModeDefault}
              onChange={(value) => setSettings({ ...settings, darkModeDefault: value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
