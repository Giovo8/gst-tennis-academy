"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { Send, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

type EmailTemplate = "welcome" | "tournament_invite" | "course_reminder" | "news" | "promotion" | "custom";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export default function SendEmailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState("");
  const [recipient, setRecipient] = useState<"all" | "role" | "custom">("all");
  const [role, setRole] = useState<"atleta" | "maestro" | "gestore" | "">("");
  const [customEmails, setCustomEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState<EmailTemplate>("custom");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name");
    if (data) setUsers(data);
  }

  function applyTemplate(template: EmailTemplate) {
    switch (template) {
      case "welcome":
        setSubject("Benvenuto nella GST Tennis Academy!");
        setMessage(
          "Ciao {nome},\n\nBenvenuto nella nostra accademia di tennis! Siamo entusiasti di averti con noi.\n\nPuoi accedere al tuo profilo e prenotare i campi tramite la nostra piattaforma.\n\nA presto sui campi!\nGST Tennis Academy"
        );
        break;
      case "tournament_invite":
        setSubject("Invito al torneo");
        setMessage(
          "Ciao {nome},\n\nSiamo lieti di invitarti al prossimo torneo che si terrà presso la nostra accademia.\n\nDettagli:\n- Data: [inserisci data]\n- Categoria: [inserisci categoria]\n- Iscrizioni entro: [inserisci scadenza]\n\nIscrizioni disponibili sulla piattaforma.\n\nCi vediamo in campo!\nGST Tennis Academy"
        );
        break;
      case "course_reminder":
        setSubject("Promemoria lezione");
        setMessage(
          "Ciao {nome},\n\nQuesto è un promemoria per la tua lezione:\n\n- Data: [inserisci data]\n- Orario: [inserisci orario]\n- Campo: [inserisci campo]\n- Maestro: [inserisci maestro]\n\nTi aspettiamo!\nGST Tennis Academy"
        );
        break;
      case "news":
        setSubject("Novità dalla GST Tennis Academy");
        setMessage(
          "Ciao {nome},\n\nVolevamo condividere con te alcune novità importanti:\n\n[Inserisci le novità]\n\nRimani aggiornato visitando la nostra piattaforma.\n\nA presto!\nGST Tennis Academy"
        );
        break;
      case "promotion":
        setSubject("Offerta speciale solo per te!");
        setMessage(
          "Ciao {nome},\n\nAbbiamo un'offerta speciale riservata ai nostri membri:\n\n[Inserisci dettagli offerta]\n\nValida fino al: [inserisci scadenza]\n\nNon perdere questa opportunità!\nGST Tennis Academy"
        );
        break;
      default:
        setSubject("");
        setMessage("");
    }
  }

  async function sendEmailCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !message) {
      setError("Compila tutti i campi");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let recipientEmails: string[] = [];
      
      if (recipient === "all") {
        recipientEmails = users.map((u) => u.email);
      } else if (recipient === "role" && role) {
        recipientEmails = users.filter((u) => u.role === role).map((u) => u.email);
      } else if (recipient === "custom") {
        recipientEmails = customEmails
          .split(",")
          .map((e) => e.trim())
          .filter((e) => e.includes("@"));
      }

      if (recipientEmails.length === 0) {
        setError("Nessun destinatario valido");
        setLoading(false);
        return;
      }

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();

      // Send email via API
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignName,
          subject,
          message,
          recipientEmails,
          recipientType: recipient,
          recipientRole: role,
          template,
          userId: user?.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Errore nell'invio dell'email");
        setLoading(false);
        return;
      }

      setSuccess(result.message || `Email inviata con successo a ${recipientEmails.length} destinatari!`);
      
      // Reset form and redirect
      setTimeout(() => {
        router.push("/dashboard/admin/mail-marketing");
      }, 2000);
    } catch (err) {
      setError("Errore nell'invio dell'email");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["admin", "gestore"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
                GESTIONE MAIL MARKETING › INVIA EMAIL
              </div>
              <h1 className="text-3xl font-bold text-secondary">
                Invia Nuova Email
              </h1>
              <p className="text-gray-600 text-sm mt-1 max-w-2xl">
                Compila il form per inviare una campagna email
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/mail-marketing"
            className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-secondary font-medium rounded-lg transition-all flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Indietro</span>
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={sendEmailCampaign} className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli Email</h2>
          <div className="space-y-6">
            {/* Campaign Name */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Nome Campagna
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Es: Newsletter Gennaio 2026"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>

            {/* Template */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Template
              </label>
              <div className="flex-1">
                <select
                  value={template}
                  onChange={(e) => {
                    const newTemplate = e.target.value as EmailTemplate;
                    setTemplate(newTemplate);
                    applyTemplate(newTemplate);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                >
                  <option value="custom">Personalizzato</option>
                  <option value="welcome">Benvenuto</option>
                  <option value="tournament_invite">Invito Torneo</option>
                  <option value="course_reminder">Promemoria Lezione</option>
                  <option value="news">Newsletter</option>
                  <option value="promotion">Promozione</option>
                </select>
              </div>
            </div>

            {/* Recipients */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Destinatari
              </label>
              <div className="flex-1 space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="all"
                    checked={recipient === "all"}
                    onChange={(e) => setRecipient(e.target.value as any)}
                    className="mr-3 h-4 w-4 text-secondary"
                  />
                  <span className="text-sm text-secondary">Tutti gli utenti</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="role"
                    checked={recipient === "role"}
                    onChange={(e) => setRecipient(e.target.value as any)}
                    className="mr-3 h-4 w-4 text-secondary"
                  />
                  <span className="text-sm text-secondary">Per ruolo</span>
                </label>
                {recipient === "role" && (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="ml-7 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  >
                    <option value="">Seleziona ruolo</option>
                    <option value="atleta">Atleti</option>
                    <option value="maestro">Maestri</option>
                    <option value="gestore">Gestori</option>
                  </select>
                )}
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="custom"
                    checked={recipient === "custom"}
                    onChange={(e) => setRecipient(e.target.value as any)}
                    className="mr-3 h-4 w-4 text-secondary"
                  />
                  <span className="text-sm text-secondary">Email personalizzate</span>
                </label>
                {recipient === "custom" && (
                  <textarea
                    value={customEmails}
                    onChange={(e) => setCustomEmails(e.target.value)}
                    placeholder="Inserisci email separate da virgola"
                    rows={3}
                    className="ml-7 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                  />
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Oggetto <span className="text-red-600">*</span>
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Oggetto dell'email"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>

            {/* Message */}
            <div className="flex items-start gap-8">
              <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                Messaggio <span className="text-red-600">*</span>
              </label>
              <div className="flex-1">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Scrivi il tuo messaggio qui..."
                  rows={10}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                />
                <p className="text-xs text-secondary/50 mt-2">
                  Usa {'{nome}'} per personalizzare con il nome del destinatario
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-6">
              <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Errore</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
          {success && (
            <div className="mt-6">
              <div className="bg-green-50 rounded-xl border border-green-200 p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Successo</p>
                  <p className="text-sm text-green-700 mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-secondary hover:opacity-90 disabled:bg-secondary/20 disabled:text-secondary/40 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Clock className="h-5 w-5 animate-spin" />
                  <span>Invio in corso...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Invia Email</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Bottom Spacer */}
        <div className="h-8" />
      </div>
    </AuthGuard>
  );
}
