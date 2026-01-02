"use client";

import { useState, useEffect } from "react";
import { Mail, Send, Users, Calendar, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

type EmailTemplate = "welcome" | "tournament_invite" | "course_reminder" | "news" | "custom";

type EmailStats = {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_failed: number;
};

export default function EmailMarketingPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);

  // Form state
  const [recipient, setRecipient] = useState<"all" | "role" | "custom">("all");
  const [role, setRole] = useState<"atleta" | "maestro" | "gestore" | "">("");
  const [customEmails, setCustomEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState<EmailTemplate>("custom");

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await fetch("/api/admin/email-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        subject,
        message,
        template: template === "custom" ? undefined : template,
      };

      if (recipient === "all") {
        payload.send_to_all = true;
      } else if (recipient === "role" && role) {
        payload.role = role;
      } else if (recipient === "custom") {
        payload.emails = customEmails.split(",").map((e) => e.trim()).filter(Boolean);
      }

      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Email inviata con successo a ${data.sent_count} destinatari!`);
        setSubject("");
        setMessage("");
        setCustomEmails("");
        loadStats();
      } else {
        setError(data.error || "Errore durante l'invio");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setError("Errore durante l'invio dell'email");
    } finally {
      setLoading(false);
    }
  }

  const templates = {
    welcome: {
      name: "Benvenuto",
      subject: "Benvenuto in GST Tennis Academy!",
      preview: "Email di benvenuto per nuovi utenti...",
    },
    tournament_invite: {
      name: "Invito Torneo",
      subject: "Partecipa al nostro prossimo torneo!",
      preview: "Invito a partecipare a un torneo...",
    },
    course_reminder: {
      name: "Promemoria Corso",
      subject: "Promemoria: Il tuo corso inizia presto",
      preview: "Promemoria per l'inizio di un corso...",
    },
    news: {
      name: "Newsletter",
      subject: "Novità dalla GST Academy",
      preview: "Newsletter con le ultime novità...",
    },
    custom: {
      name: "Personalizzata",
      subject: "",
      preview: "Crea la tua email personalizzata",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-700 mb-2">
            Email Marketing
          </h1>
          <p className="text-gray-600">Invia email agli utenti e gestisci le campagne</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-700">{stats.total_sent}</p>
            </div>
            <p className="text-sm font-semibold text-gray-600">Inviate</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-700">{stats.total_delivered}</p>
            </div>
            <p className="text-sm font-semibold text-gray-600">Consegnate</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Mail className="h-5 w-5 text-cyan-600" />
              </div>
              <p className="text-2xl font-bold text-gray-700">{stats.total_opened}</p>
            </div>
            <p className="text-sm font-semibold text-gray-600">Aperte</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.total_sent > 0 ? Math.round((stats.total_opened / stats.total_sent) * 100) : 0}% open rate
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-700">{stats.total_clicked}</p>
            </div>
            <p className="text-sm font-semibold text-gray-600">Cliccate</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.total_sent > 0 ? Math.round((stats.total_clicked / stats.total_sent) * 100) : 0}% click rate
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-gray-700">{stats.total_failed}</p>
            </div>
            <p className="text-sm font-semibold text-gray-600">Fallite</p>
          </div>
        </div>
      )}

      {/* Send Email Form */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-700 mb-6">Invia Nuova Email</h2>

        {success && (
          <div className="mb-6 rounded-lg bg-green-100 border border-green-300 p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-100 border border-red-300 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSendEmail} className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Template</label>
            <div className="grid gap-3 md:grid-cols-5">
              {Object.entries(templates).map(([key, { name, preview }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTemplate(key as EmailTemplate);
                    if (key !== "custom") {
                      setSubject(templates[key as EmailTemplate].subject);
                    }
                  }}
                  className={`p-4 rounded-lg text-left transition-all ${
                    template === key
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <p className={`font-semibold text-sm mb-1 ${template === key ? 'text-white' : 'text-gray-700'}`}>{name}</p>
                  <p className={`text-xs ${template === key ? 'text-white/80' : 'text-gray-500'}`}>{preview}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Destinatari</label>
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRecipient("all")}
                  className={`flex-1 p-4 rounded-lg transition-all ${
                    recipient === "all"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <Users className={`h-5 w-5 mx-auto mb-2 ${recipient === "all" ? 'text-white' : 'text-cyan-600'}`} />
                  <p className={`text-sm font-semibold ${recipient === "all" ? 'text-white' : 'text-gray-700'}`}>Tutti gli utenti</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipient("role")}
                  className={`flex-1 p-4 rounded-lg transition-all ${
                    recipient === "role"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <Users className={`h-5 w-5 mx-auto mb-2 ${recipient === "role" ? 'text-white' : 'text-cyan-600'}`} />
                  <p className={`text-sm font-semibold ${recipient === "role" ? 'text-white' : 'text-gray-700'}`}>Per ruolo</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipient("custom")}
                  className={`flex-1 p-4 rounded-lg transition-all ${
                    recipient === "custom"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <Mail className={`h-5 w-5 mx-auto mb-2 ${recipient === "custom" ? 'text-white' : 'text-cyan-600'}`} />
                  <p className={`text-sm font-semibold ${recipient === "custom" ? 'text-white' : 'text-gray-700'}`}>Email specifiche</p>
                </button>
              </div>

              {recipient === "role" && (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full rounded-lg bg-white border border-gray-300 px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleziona ruolo</option>
                  <option value="atleta">Atleti</option>
                  <option value="maestro">Maestri</option>
                  <option value="gestore">Gestori</option>
                </select>
              )}

              {recipient === "custom" && (
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="Inserisci le email separate da virgola (es: email1@example.com, email2@example.com)"
                  className="w-full rounded-lg bg-white border border-gray-300 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                  required
                />
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Oggetto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Oggetto dell'email"
              className="w-full rounded-lg bg-white border border-gray-300 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Messaggio</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Scrivi il contenuto dell'email..."
              className="w-full rounded-lg bg-white border border-gray-300 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[200px]"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-base font-semibold text-white hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Invio in corso...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Invia Email
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
