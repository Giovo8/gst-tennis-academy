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
    <div className="min-h-screen bg-[#021627]">
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Email Marketing</h1>
          <p className="text-gray-400">Invia email agli utenti e gestisci le campagne</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-5 mb-8">
            <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Send className="h-5 w-5 text-blue-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase">Inviate</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total_sent}</p>
            </div>

            <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase">Consegnate</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total_delivered}</p>
            </div>

            <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="h-5 w-5 text-cyan-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase">Aperte</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total_opened}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.total_sent > 0 ? Math.round((stats.total_opened / stats.total_sent) * 100) : 0}% open rate
              </p>
            </div>

            <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase">Cliccate</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total_clicked}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.total_sent > 0 ? Math.round((stats.total_clicked / stats.total_sent) * 100) : 0}% click rate
              </p>
            </div>

            <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase">Fallite</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.total_failed}</p>
            </div>
          </div>
        )}

        {/* Send Email Form */}
        <div className="rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Invia Nuova Email</h2>

          {success && (
            <div className="mb-6 rounded-xl bg-green-500/20 border border-green-500/40 p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-500/20 border border-red-500/40 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSendEmail} className="space-y-6">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Template</label>
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
                    className={`p-4 rounded-xl text-left transition-all ${
                      template === key
                        ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/60"
                        : "bg-white/5 border-2 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <p className="font-semibold text-white text-sm mb-1">{name}</p>
                    <p className="text-xs text-gray-400">{preview}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Destinatari</label>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipient("all")}
                    className={`flex-1 p-4 rounded-xl transition-all ${
                      recipient === "all"
                        ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/60"
                        : "bg-white/5 border-2 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <Users className="h-5 w-5 mx-auto mb-2 text-cyan-400" />
                    <p className="text-sm font-semibold text-white">Tutti gli utenti</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipient("role")}
                    className={`flex-1 p-4 rounded-xl transition-all ${
                      recipient === "role"
                        ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/60"
                        : "bg-white/5 border-2 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <Users className="h-5 w-5 mx-auto mb-2 text-cyan-400" />
                    <p className="text-sm font-semibold text-white">Per ruolo</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipient("custom")}
                    className={`flex-1 p-4 rounded-xl transition-all ${
                      recipient === "custom"
                        ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400/60"
                        : "bg-white/5 border-2 border-white/10 hover:border-white/30"
                    }`}
                  >
                    <Mail className="h-5 w-5 mx-auto mb-2 text-cyan-400" />
                    <p className="text-sm font-semibold text-white">Email specifiche</p>
                  </button>
                </div>

                {recipient === "role" && (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white focus:border-cyan-400/60 focus:outline-none"
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
                    className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none min-h-[100px]"
                    required
                  />
                )}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Oggetto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Oggetto dell'email"
                className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">Messaggio</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Scrivi il contenuto dell'email..."
                className="w-full rounded-xl bg-white/5 border-2 border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:outline-none min-h-[200px]"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 text-base font-semibold text-white hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
      </main>
    </div>
  );
}
