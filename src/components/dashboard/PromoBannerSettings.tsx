"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type BannerSettings = {
  is_enabled: boolean;
  message: string;
  cta_text: string;
  cta_url: string;
  background_color: string;
};

export default function PromoBannerSettings() {
  const [settings, setSettings] = useState<BannerSettings>({
    is_enabled: true,
    message: "🎾 Novità! Registrati oggi e ricevi 2 crediti gratuiti per prenotare i campi!",
    cta_text: "Iscriviti",
    cta_url: "/register",
    background_color: "blue",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await fetch("/api/promo-banner");
      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          setSettings(data);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: "error", text: "Devi essere autenticato" });
        return;
      }

      const response = await fetch("/api/promo-banner", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Impostazioni salvate con successo!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Errore nel salvare le impostazioni" });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Errore nel salvare le impostazioni" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#042b4a] rounded-2xl border border-white/10 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Settings className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Banner Promozionale</h2>
            <p className="text-sm text-gray-400">Gestisci il banner visualizzato nella homepage</p>
          </div>
        </div>
        
        {/* Enable/Disable Toggle */}
        <button
          onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            settings.is_enabled
              ? "bg-green-500/20 text-green-400 border border-green-500/40"
              : "bg-gray-500/20 text-gray-400 border border-gray-500/40"
          }`}
        >
          {settings.is_enabled ? (
            <>
              <Eye className="h-4 w-4" />
              <span>Attivo</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Disattivato</span>
            </>
          )}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/20 border border-green-500/40 text-green-400"
              : "bg-red-500/20 border border-red-500/40 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="space-y-4">
        {/* Message Text */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Messaggio
          </label>
          <textarea
            value={settings.message}
            onChange={(e) => setSettings({ ...settings, message: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-[#021627] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Inserisci il messaggio del banner..."
          />
        </div>

        {/* CTA Text & URL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Testo Bottone
            </label>
            <input
              type="text"
              value={settings.cta_text}
              onChange={(e) => setSettings({ ...settings, cta_text: e.target.value })}
              className="w-full px-4 py-3 bg-[#021627] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="es. Iscriviti"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL Bottone
            </label>
            <input
              type="text"
              value={settings.cta_url}
              onChange={(e) => setSettings({ ...settings, cta_url: e.target.value })}
              className="w-full px-4 py-3 bg-[#021627] border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="es. /register"
            />
          </div>
        </div>

        {/* Color Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Colore Tema
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "blue", label: "Blu", gradient: "from-blue-600 to-cyan-500" },
              { value: "green", label: "Verde", gradient: "from-green-600 to-emerald-500" },
              { value: "purple", label: "Viola", gradient: "from-purple-600 to-violet-500" },
              { value: "red", label: "Rosso", gradient: "from-red-600 to-rose-500" },
            ].map((color) => (
              <button
                key={color.value}
                onClick={() => setSettings({ ...settings, background_color: color.value })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.background_color === color.value
                    ? "border-white scale-105"
                    : "border-white/20 hover:border-white/40"
                }`}
              >
                <div className={`h-8 rounded bg-gradient-to-r ${color.gradient} mb-2`}></div>
                <p className="text-sm font-medium text-white">{color.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Anteprima
        </label>
        <div className={`relative bg-gradient-to-r ${
          settings.background_color === "blue" ? "from-blue-600 via-cyan-500 to-blue-600" :
          settings.background_color === "green" ? "from-green-600 via-emerald-500 to-green-600" :
          settings.background_color === "purple" ? "from-purple-600 via-violet-500 to-purple-600" :
          "from-red-600 via-rose-500 to-red-600"
        } text-white rounded-lg overflow-hidden p-4`}>
          <div className="flex items-center justify-center gap-3">
            <p className="text-sm font-semibold">{settings.message}</p>
            <span className="px-4 py-1.5 bg-white text-gray-900 rounded-full text-sm font-bold">
              {settings.cta_text}
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
      >
        {saving ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Salvando...</span>
          </>
        ) : (
          <>
            <Save className="h-5 w-5" />
            <span>Salva Modifiche</span>
          </>
        )}
      </button>
    </div>
  );
}
