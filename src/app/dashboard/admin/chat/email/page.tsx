"use client";

import { useState, useEffect } from "react";
import { Mail, Send, Users, AlertCircle, CheckCircle, Inbox, UserPlus, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Tab = "send" | "inbox";
type EmailTemplate = "welcome" | "tournament_invite" | "course_reminder" | "news" | "custom";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string; email: string };
  recipient?: { full_name: string; email: string };
};

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export default function EmailMarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("send");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Internal messaging
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [internalSubject, setInternalSubject] = useState("");
  const [internalMessage, setInternalMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Form state
  const [recipient, setRecipient] = useState<"all" | "role" | "custom">("all");
  const [role, setRole] = useState<"atleta" | "maestro" | "gestore" | "">("");
  const [customEmails, setCustomEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState<EmailTemplate>("custom");

  useEffect(() => {
    if (activeTab === "inbox") {
      loadMessages();
      loadUsers();
    }
  }, [activeTab]);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name");
    if (data) setUsers(data);
  }

  async function loadMessages() {
    setLoadingMessages(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name, email),
        recipient:profiles!messages_recipient_id_fkey(full_name, email)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (data) {
      const formattedMessages = data.map(msg => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
        recipient: Array.isArray(msg.recipient) ? msg.recipient[0] : msg.recipient
      }));
      setMessages(formattedMessages);
    }
    setLoadingMessages(false);
  }

  async function sendInternalMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !internalMessage) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Utente non autenticato");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: selectedUser,
        subject: internalSubject || null,
        content: internalMessage
      });

    if (insertError) {
      setError("Errore nell'invio del messaggio");
    } else {
      setSuccess("Messaggio inviato con successo!");
      setSelectedUser("");
      setInternalSubject("");
      setInternalMessage("");
      loadMessages();
    }
    setLoading(false);
  }

  async function markAsRead(messageId: string) {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId);
    loadMessages();
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Gestione Email
          </h1>
          <p className="text-secondary/70 font-medium">Invia email e messaggi interni agli utenti</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("send")}
          className={`px-6 py-3 rounded-md text-sm font-semibold transition-all ${
            activeTab === "send"
              ? "bg-secondary text-white"
              : "bg-white text-secondary hover:bg-secondary/5"
          }`}
        >
          <Send className="h-4 w-4 inline-block mr-2" />
          Invia Email
        </button>
        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-6 py-3 rounded-md text-sm font-semibold transition-all ${
            activeTab === "inbox"
              ? "bg-secondary text-white"
              : "bg-white text-secondary hover:bg-secondary/5"
          }`}
        >
          <Inbox className="h-4 w-4 inline-block mr-2" />
          Messaggi Interni
        </button>
      </div>

      {activeTab === "send" ? (
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold text-secondary mb-6">Invia Nuova Email</h2>

          {success && (
            <div className="mb-6 rounded-md bg-green-100 border border-green-300 p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-md bg-red-100 border border-red-300 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSendEmail} className="space-y-6">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-3">Template</label>
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
                    className={`p-4 rounded-md text-left transition-all ${
                      template === key
                        ? "bg-secondary text-white"
                        : "bg-white text-secondary hover:bg-secondary/5"
                    }`}
                  >
                    <p className="font-semibold text-sm mb-1">{name}</p>
                    <p className={`text-xs ${template === key ? 'text-white/80' : 'text-secondary/70'}`}>{preview}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-3">Destinatari</label>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipient("all")}
                    className={`flex-1 p-4 rounded-md transition-all ${
                      recipient === "all"
                        ? "bg-secondary text-white"
                        : "bg-white text-secondary hover:bg-secondary/5"
                    }`}
                  >
                    <Users className="h-5 w-5 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Tutti gli utenti</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipient("role")}
                    className={`flex-1 p-4 rounded-md transition-all ${
                      recipient === "role"
                        ? "bg-secondary text-white"
                        : "bg-white text-secondary hover:bg-secondary/5"
                    }`}
                  >
                    <Users className="h-5 w-5 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Per ruolo</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipient("custom")}
                    className={`flex-1 p-4 rounded-md transition-all ${
                      recipient === "custom"
                        ? "bg-secondary text-white"
                        : "bg-white text-secondary hover:bg-secondary/5"
                    }`}
                  >
                    <Mail className="h-5 w-5 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Email specifiche</p>
                  </button>
                </div>

                {recipient === "role" && (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full rounded-md bg-white px-4 py-3 text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
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
                    className="w-full rounded-md bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 min-h-[100px]"
                    required
                  />
                )}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-3">Oggetto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Oggetto dell'email"
                className="w-full rounded-md bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-3">Messaggio</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Scrivi il contenuto dell'email..."
                className="w-full rounded-md bg-white px-4 py-3 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 min-h-[200px]"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-6 py-4 text-base font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
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
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Send Internal Message */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invia Messaggio Interno
            </h2>

            {success && (
              <div className="mb-6 rounded-md bg-green-100 border border-green-300 p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-700 flex-shrink-0 mt-0.5" />
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-md bg-red-100 border border-red-300 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-700 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={sendInternalMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">Destinatario</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full rounded-md bg-white px-4 py-2.5 text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  required
                >
                  <option value="">Seleziona utente</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.role}) - {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">Oggetto (opzionale)</label>
                <input
                  type="text"
                  value={internalSubject}
                  onChange={(e) => setInternalSubject(e.target.value)}
                  placeholder="Oggetto del messaggio"
                  className="w-full rounded-md bg-white px-4 py-2.5 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">Messaggio</label>
                <textarea
                  value={internalMessage}
                  onChange={(e) => setInternalMessage(e.target.value)}
                  placeholder="Scrivi il tuo messaggio..."
                  className="w-full rounded-md bg-white px-4 py-2.5 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 min-h-[150px]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Invio...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Invia Messaggio
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Messages Inbox */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Messaggi Ricevuti/Inviati
            </h2>

            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-secondary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-secondary/70">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessun messaggio</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => !msg.is_read && markAsRead(msg.id)}
                    className={`p-4 rounded-md cursor-pointer transition-all ${
                      msg.is_read
                        ? "bg-secondary/5 hover:bg-secondary/10"
                        : "bg-secondary/10 hover:bg-secondary/15 border-l-4 border-secondary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${!msg.is_read ? 'text-secondary' : 'text-secondary/70'}`}>
                            {msg.sender?.full_name || "Utente"}
                          </span>
                          {!msg.is_read && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-secondary text-white rounded-full">
                              Nuovo
                            </span>
                          )}
                        </div>
                        {msg.subject && (
                          <p className="text-sm font-medium text-secondary mb-1">{msg.subject}</p>
                        )}
                        <p className="text-sm text-secondary/70 line-clamp-2">{msg.content}</p>
                        <p className="text-xs text-secondary/50 mt-2">
                          {format(new Date(msg.created_at), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                        </p>
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
