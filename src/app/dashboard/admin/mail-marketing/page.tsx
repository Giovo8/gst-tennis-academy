"use client";

import { useState, useEffect } from "react";
import { Mail, Send, Users, Target, BarChart3, TrendingUp, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type EmailTemplate = "welcome" | "tournament_invite" | "course_reminder" | "news" | "promotion" | "custom";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  content: string;
  target_audience: string;
  status: "draft" | "sent" | "scheduled";
  sent_at: string | null;
  created_at: string;
  recipients_count: number;
  opened_count: number;
  clicked_count: number;
};

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export default function MailMarketingPage() {
  const [activeTab, setActiveTab] = useState<"campaigns" | "send" | "analytics">("campaigns");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [recipient, setRecipient] = useState<"all" | "role" | "custom">("all");
  const [role, setRole] = useState<"atleta" | "maestro" | "gestore" | "">("");
  const [customEmails, setCustomEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState<EmailTemplate>("custom");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadCampaigns();
    loadUsers();
  }, []);

  async function loadCampaigns() {
    // In a real app, you would load campaigns from database
    // For now, we'll use mock data
    setCampaigns([]);
  }

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

      // In a real app, you would send emails via API
      // For now, we'll just show a success message
      console.log("Sending email campaign to:", recipientEmails);
      console.log("Subject:", subject);
      console.log("Message:", message);

      // Save campaign
      const newCampaign: Campaign = {
        id: Date.now().toString(),
        name: campaignName || "Campagna senza nome",
        subject,
        content: message,
        target_audience: recipient,
        status: "sent",
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        recipients_count: recipientEmails.length,
        opened_count: 0,
        clicked_count: 0,
      };

      setCampaigns([newCampaign, ...campaigns]);

      setSuccess(`Email inviata con successo a ${recipientEmails.length} destinatari!`);
      
      // Reset form
      setCampaignName("");
      setSubject("");
      setMessage("");
      setRecipient("all");
      setRole("");
      setCustomEmails("");
      setTemplate("custom");
    } catch (err) {
      setError("Errore nell'invio dell'email");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="h-7 w-7 text-secondary" />
          Mail Marketing
        </h1>
        <p className="text-gray-600 mt-1">
          Invia campagne email ai tuoi utenti e monitora le performance
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "campaigns"
                ? "border-secondary text-secondary"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Campagne
          </button>
          <button
            onClick={() => setActiveTab("send")}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "send"
                ? "border-secondary text-secondary"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Invia Email
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "analytics"
                ? "border-secondary text-secondary"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Statistiche
          </button>
        </div>
      </div>

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna campagna</h3>
              <p className="text-gray-600 mb-4">
                Inizia a creare campagne email per comunicare con i tuoi utenti
              </p>
              <button
                onClick={() => setActiveTab("send")}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Crea campagna
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{campaign.name}</h3>
                      <p className="text-sm text-gray-600">{campaign.subject}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        campaign.status === "sent"
                          ? "bg-green-100 text-green-800"
                          : campaign.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {campaign.status === "sent" ? "Inviata" : campaign.status === "scheduled" ? "Programmata" : "Bozza"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Users className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                      <p className="text-xl font-bold text-gray-900">{campaign.recipients_count}</p>
                      <p className="text-xs text-gray-600">Destinatari</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <p className="text-xl font-bold text-gray-900">{campaign.opened_count}</p>
                      <p className="text-xs text-gray-600">Aperture</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-xl font-bold text-gray-900">{campaign.clicked_count}</p>
                      <p className="text-xs text-gray-600">Click</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-sm font-semibold text-gray-900">
                        {campaign.sent_at
                          ? format(new Date(campaign.sent_at), "dd MMM yyyy", { locale: it })
                          : "-"}
                      </p>
                      <p className="text-xs text-gray-600">Data invio</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Send Email Tab */}
      {activeTab === "send" && (
        <form onSubmit={sendEmailCampaign} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuova Campagna Email</h2>
              
              {/* Campaign Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Campagna
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Es: Newsletter Gennaio 2026"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>

              {/* Template Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <select
                  value={template}
                  onChange={(e) => {
                    const newTemplate = e.target.value as EmailTemplate;
                    setTemplate(newTemplate);
                    applyTemplate(newTemplate);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
                >
                  <option value="custom">Personalizzato</option>
                  <option value="welcome">Benvenuto</option>
                  <option value="tournament_invite">Invito Torneo</option>
                  <option value="course_reminder">Promemoria Lezione</option>
                  <option value="news">Newsletter</option>
                  <option value="promotion">Promozione</option>
                </select>
              </div>

              {/* Recipients */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinatari
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={recipient === "all"}
                      onChange={(e) => setRecipient(e.target.value as any)}
                      className="mr-2"
                    />
                    Tutti gli utenti
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="role"
                      checked={recipient === "role"}
                      onChange={(e) => setRecipient(e.target.value as any)}
                      className="mr-2"
                    />
                    Per ruolo
                  </label>
                  {recipient === "role" && (
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="ml-6 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    >
                      <option value="">Seleziona ruolo</option>
                      <option value="atleta">Atleti</option>
                      <option value="maestro">Maestri</option>
                      <option value="gestore">Gestori</option>
                    </select>
                  )}
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="custom"
                      checked={recipient === "custom"}
                      onChange={(e) => setRecipient(e.target.value as any)}
                      className="mr-2"
                    />
                    Email personalizzate
                  </label>
                  {recipient === "custom" && (
                    <textarea
                      value={customEmails}
                      onChange={(e) => setCustomEmails(e.target.value)}
                      placeholder="Inserisci email separate da virgola"
                      rows={3}
                      className="ml-6 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    />
                  )}
                </div>
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oggetto
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Oggetto dell'email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Messaggio
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Scrivi il tuo messaggio qui..."
                  rows={10}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Usa {"{nome}"} per personalizzare con il nome del destinatario
                </p>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <XCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span>{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Clock className="h-5 w-5 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Invia Email
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{campaigns.length}</p>
              <p className="text-sm text-gray-600">Campagne totali</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {campaigns.reduce((sum, c) => sum + c.recipients_count, 0)}
              </p>
              <p className="text-sm text-gray-600">Email inviate</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {campaigns.reduce((sum, c) => sum + c.opened_count, 0)}
              </p>
              <p className="text-sm text-gray-600">Aperture totali</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {campaigns.reduce((sum, c) => sum + c.recipients_count, 0) > 0
                  ? `${Math.round((campaigns.reduce((sum, c) => sum + c.opened_count, 0) / campaigns.reduce((sum, c) => sum + c.recipients_count, 0)) * 100)}%`
                  : "0%"}
              </p>
              <p className="text-sm text-gray-600">Tasso di apertura</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Performance Campagne</h3>
            {campaigns.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nessuna campagna da visualizzare</p>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                      <p className="text-sm text-gray-600">{campaign.subject}</p>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{campaign.recipients_count}</p>
                        <p className="text-xs text-gray-600">Inviati</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{campaign.opened_count}</p>
                        <p className="text-xs text-gray-600">Aperti</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">
                          {campaign.recipients_count > 0
                            ? `${Math.round((campaign.opened_count / campaign.recipients_count) * 100)}%`
                            : "0%"}
                        </p>
                        <p className="text-xs text-gray-600">Tasso</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
