"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import {
  MessageSquare,
  Send,
  Users,
  Search,
  Plus,
  Bell,
  Megaphone,
  Mail,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success";
  target_roles: string[];
  is_active: boolean;
  created_at: string;
}

export default function AdminCommunicationsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"announcements" | "email" | "push">("announcements");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success">("info");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAnnouncements(data);
    }
    setLoading(false);
  }

  async function createAnnouncement() {
    if (!title || !content) {
      alert("Compila tutti i campi");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newAnnouncement, error } = await supabase
      .from("announcements")
      .insert({
        title,
        content,
        type,
        target_roles: targetRoles.length > 0 ? targetRoles : null,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      alert("Errore: " + error.message);
    } else {
      // Send notifications to all target users
      const roles = targetRoles.length > 0 ? targetRoles : ["atleta", "maestro", "gestore"];
      
      const { data: targetUsers } = await supabase
        .from("profiles")
        .select("id")
        .in("role", roles);

      if (targetUsers && targetUsers.length > 0) {
        // Send notification to each user via API
        for (const targetUser of targetUsers) {
          await createNotification({
            userId: targetUser.id,
            type: "announcement",
            title: "Nuovo annuncio",
            message: title.substring(0, 100) + (title.length > 100 ? "..." : ""),
            link: "/annunci",
          });
        }
      }

      setTitle("");
      setContent("");
      setType("info");
      setTargetRoles([]);
      setShowNewModal(false);
      loadAnnouncements();
    }
  }

  async function toggleAnnouncementStatus(id: string, isActive: boolean) {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (!error) {
      loadAnnouncements();
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Eliminare questo annuncio?")) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (!error) {
      loadAnnouncements();
    }
  }

  function toggleRole(role: string) {
    if (targetRoles.includes(role)) {
      setTargetRoles(targetRoles.filter(r => r !== role));
    } else {
      setTargetRoles([...targetRoles, role]);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const getTypeIcon = (t: string) => {
    switch (t) {
      case "warning":
        return <AlertCircle className="h-4 w-4 text-[var(--accent-yellow)]" />;
      case "success":
        return <Check className="h-4 w-4 text-[var(--accent-green)]" />;
      default:
        return <Bell className="h-4 w-4 text-[var(--accent-blue)]" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Comunicazioni</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Gestisci annunci e notifiche agli utenti
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-green)] text-white rounded-lg hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuovo Annuncio
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {[
          { id: "announcements", label: "Annunci", icon: Megaphone },
          { id: "email", label: "Email", icon: Mail },
          { id: "push", label: "Notifiche Push", icon: Bell },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[var(--accent-green)] text-[var(--accent-green)]"
                : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="card rounded-xl p-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-[var(--foreground-muted)]" />
              <p className="text-[var(--foreground-muted)] mt-4">
                Nessun annuncio creato
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-4 text-[var(--accent-green)] hover:underline"
              >
                Crea il primo annuncio →
              </button>
            </div>
          ) : (
            announcements.map(announcement => (
              <div
                key={announcement.id}
                className={`card rounded-xl p-4 border-l-4 ${
                  announcement.type === "warning"
                    ? "border-l-[var(--accent-yellow)]"
                    : announcement.type === "success"
                    ? "border-l-[var(--accent-green)]"
                    : "border-l-[var(--accent-blue)]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getTypeIcon(announcement.type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--foreground)]">
                          {announcement.title}
                        </h3>
                        {!announcement.is_active && (
                          <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                            Disattivo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--foreground-muted)] mt-1">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--foreground-muted)]">
                        <span>{formatDate(announcement.created_at)}</span>
                        {announcement.target_roles && announcement.target_roles.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {announcement.target_roles.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAnnouncementStatus(announcement.id, announcement.is_active)}
                      className={`px-3 py-1 text-xs rounded-lg ${
                        announcement.is_active
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          : "bg-[var(--accent-green)]/10 text-[var(--accent-green)]"
                      }`}
                    >
                      {announcement.is_active ? "Disattiva" : "Attiva"}
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="px-3 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Email Tab */}
      {activeTab === "email" && (
        <div className="card rounded-xl p-8 text-center">
          <Mail className="h-12 w-12 mx-auto text-[var(--foreground-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mt-4">
            Invio Email di Massa
          </h3>
          <p className="text-[var(--foreground-muted)] mt-2">
            Questa funzionalità sarà disponibile a breve.
          </p>
        </div>
      )}

      {/* Push Tab */}
      {activeTab === "push" && (
        <div className="card rounded-xl p-8 text-center">
          <Bell className="h-12 w-12 mx-auto text-[var(--foreground-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mt-4">
            Notifiche Push
          </h3>
          <p className="text-[var(--foreground-muted)] mt-2">
            Questa funzionalità sarà disponibile a breve.
          </p>
        </div>
      )}

      {/* New Announcement Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Nuovo Annuncio
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Titolo
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  placeholder="Titolo dell'annuncio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Contenuto
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none"
                  placeholder="Scrivi il messaggio..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Tipo
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "info", label: "Info", color: "blue" },
                    { id: "warning", label: "Avviso", color: "yellow" },
                    { id: "success", label: "Successo", color: "green" },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id as typeof type)}
                      className={`flex-1 py-2 rounded-lg border transition-colors ${
                        type === t.id
                          ? t.color === "blue"
                            ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                            : t.color === "yellow"
                            ? "border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)]"
                            : "border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)]"
                          : "border-[var(--border)] text-[var(--foreground-muted)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Destinatari
                </label>
                <div className="flex flex-wrap gap-2">
                  {["atleta", "maestro", "gestore", "admin"].map(role => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded-lg border transition-colors ${
                        targetRoles.includes(role)
                          ? "border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)]"
                          : "border-[var(--border)] text-[var(--foreground-muted)]"
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  Lascia vuoto per tutti
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                Annulla
              </button>
              <button
                onClick={createAnnouncement}
                className="px-4 py-2 bg-[var(--accent-green)] text-white rounded-lg hover:opacity-90"
              >
                Pubblica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
