"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Calendar,
  User,
  Link as LinkIcon,
  Loader2,
  X,
} from "lucide-react";

interface InviteCode {
  id: string;
  code: string;
  role: string;
  uses_remaining: number | null;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
  used_by?: {
    full_name: string;
    email: string;
  }[];
}

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    role: "atleta",
    max_uses: 1,
    expires_days: 7,
  });

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    const { data, error } = await supabase
      .from("invite_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCodes(data);
    }
    setLoading(false);
  }

  async function generateCode() {
    setSaving(true);

    const code = generateRandomCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + formData.expires_days);

    const { data, error } = await supabase
      .from("invite_codes")
      .insert({
        code,
        role: formData.role,
        max_uses: formData.max_uses,
        uses_remaining: formData.max_uses,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      setCodes([data, ...codes]);
      setShowModal(false);
      setFormData({ role: "atleta", max_uses: 1, expires_days: 7 });
    }

    setSaving(false);
  }

  async function deleteCode(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo codice?")) return;
    
    setDeleting(id);

    const { error } = await supabase
      .from("invite_codes")
      .delete()
      .eq("id", id);

    if (!error) {
      setCodes(codes.filter(c => c.id !== id));
    }

    setDeleting(null);
  }

  function generateRandomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function copyToClipboard(code: string) {
    const url = `${window.location.origin}/register?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function isExpired(expiresAt: string | null) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  const roleLabels: Record<string, string> = {
    atleta: "Atleta",
    maestro: "Maestro",
    gestore: "Gestore",
    admin: "Admin",
  };

  const roleColors: Record<string, string> = {
    atleta: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    maestro: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    gestore: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Codici Invito</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Genera link privati per la registrazione
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuovo Codice
        </button>
      </div>

      {/* Codes List */}
      {codes.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <Key className="h-16 w-16 text-[var(--foreground-subtle)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Nessun codice invito
          </h3>
          <p className="text-[var(--foreground-muted)] mb-4">
            Genera il tuo primo codice per invitare nuovi utenti
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-dark)] transition-colors"
          >
            <Plus className="h-5 w-5" />
            Genera Codice
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => {
            const expired = isExpired(code.expires_at);
            const depleted = code.uses_remaining === 0;
            const inactive = expired || depleted;

            return (
              <div
                key={code.id}
                className={`bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 ${
                  inactive ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      inactive ? "bg-gray-100 dark:bg-gray-800" : "bg-[var(--primary)]/10"
                    }`}>
                      <Key className={`h-6 w-6 ${
                        inactive ? "text-gray-400" : "text-[var(--primary)]"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-lg text-[var(--foreground)]">
                          {code.code}
                        </code>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[code.role]}`}>
                          {roleLabels[code.role]}
                        </span>
                        {expired && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            Scaduto
                          </span>
                        )}
                        {depleted && !expired && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            Esaurito
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-[var(--foreground-muted)]">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {code.uses_remaining ?? "∞"} / {code.max_uses ?? "∞"} usi
                        </span>
                        {code.expires_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scade: {formatDate(code.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!inactive && (
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors"
                      >
                        {copiedCode === code.code ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Copiato!</span>
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4" />
                            <span className="text-sm">Copia Link</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => deleteCode(code.id)}
                      disabled={deleting === code.id}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--foreground-muted)] hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting === code.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Nuovo Codice Invito
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Ruolo
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <option value="atleta">Atleta</option>
                  <option value="maestro">Maestro</option>
                  <option value="gestore">Gestore</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Numero massimo utilizzi
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                  Scadenza (giorni)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.expires_days}
                  onChange={(e) => setFormData({ ...formData, expires_days: parseInt(e.target.value) || 7 })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={generateCode}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generazione...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Genera
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
