"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import {
  Loader2, AlertCircle, Trash2, Crown, Home, Dumbbell, User,
  Copy, CheckCircle2, Calendar, Hash, RefreshCw, UserCheck, Search,
} from "lucide-react";

type InviteCode = {
  id: string;
  code: string;
  role: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_remaining: number | null;
  created_by: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
};

const roleConfig: Record<string, { label: string; bgColor: string; borderLeftColor: string; Icon: React.ElementType }> = {
  admin:   { label: "Admin",   bgColor: "#023047",          borderLeftColor: "#011a24", Icon: Crown },
  gestore: { label: "Gestore", bgColor: "#023047",          borderLeftColor: "#011a24", Icon: Home },
  maestro: { label: "Maestro", bgColor: "#05384c",          borderLeftColor: "#022431", Icon: Dumbbell },
  atleta:  { label: "Atleta",  bgColor: "var(--secondary)", borderLeftColor: "#023047", Icon: User },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 pb-6 border-b border-gray-200 last:border-0 last:pb-0">
      <label className="sm:w-48 text-sm text-secondary font-medium flex-shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function InviteCodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const codeId = params.id as string;

  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [codeUses, setCodeUses] = useState<{ user_id: string; used_at: string; profile: Profile | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usersSearch, setUsersSearch] = useState("");

  useEffect(() => {
    if (codeId) loadCode();
  }, [codeId]);

  async function loadCode() {
    try {
      const { data, error: codeError } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("id", codeId)
        .single();

      if (codeError) throw codeError;
      setInviteCode(data);

      // Carica chi ha creato il codice
      if (data.created_by) {
        const { data: creatorData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", data.created_by)
          .single();
        setCreator(creatorData || null);
      }

      // Carica tutti gli utilizzi via server API (service role, include vecchi + nuovi)
      const res = await fetch(`/api/invite-codes/${codeId}/uses`);
      if (res.ok) {
        const json = await res.json();
        setCodeUses(json.uses || []);
      }
    } catch {
      setError("Codice invito non trovato");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    if (!inviteCode) return;
    if (!confirm("Sei sicuro di voler disattivare questo codice invito?")) return;
    setDisabling(true);
    const { error } = await supabase
      .from("invite_codes")
      .update({ expires_at: new Date().toISOString() })
      .eq("id", codeId);
    if (!error) {
      setInviteCode((prev) => prev ? { ...prev, expires_at: new Date().toISOString() } : prev);
    }
    setDisabling(false);
  }

  async function handleDelete() {
    if (!confirm("Sei sicuro di voler eliminare questo codice invito?")) return;
    setDeleting(true);
    const { error } = await supabase.from("invite_codes").delete().eq("id", codeId);
    if (!error) {
      router.push("/dashboard/admin/invite-codes");
    } else {
      setDeleting(false);
    }
  }

  function copyLink() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/register?code=${inviteCode.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (error || !inviteCode) {
    return (
      <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-900">Errore</p>
          <p className="text-sm text-red-700 mt-1">{error || "Codice non trovato"}</p>
        </div>
      </div>
    );
  }

  const cfg = roleConfig[inviteCode.role] || roleConfig.atleta;
  const RoleIcon = cfg.Icon;

  const isExpired = Boolean(inviteCode.expires_at && new Date(inviteCode.expires_at) <= new Date());
  const isExhausted = Boolean(inviteCode.max_uses !== null && inviteCode.uses_remaining !== null && inviteCode.uses_remaining <= 0);
  const isValid = !isExpired && !isExhausted;

  const statusLabel = isExpired ? "Scaduto" : isExhausted ? "Esaurito" : "Attivo";

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="breadcrumb text-secondary/60 mb-1">
          <Link href="/dashboard/admin/users" className="hover:text-secondary/80 transition-colors">
            Gestione Utenti
          </Link>
          {" › "}
          <Link href="/dashboard/admin/invite-codes" className="hover:text-secondary/80 transition-colors">
            Codici Invito
          </Link>
          {" › "}
          <span>Dettaglio</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Codice Invito</h1>
      </div>

      {/* Header card */}
      <div
        className="rounded-xl p-6 border-l-4"
        style={{ backgroundColor: cfg.bgColor, borderLeftColor: cfg.borderLeftColor }}
      >
        <div className="flex items-start gap-6">
          <RoleIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {inviteCode.code}
            </h2>
          </div>
        </div>
      </div>

      {/* Dettagli */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Dettagli Codice</h2>
        </div>
        <div className="px-6 py-6">
          <div className="space-y-6">

            <Field label="Codice">
              <p className="text-secondary font-semibold">{inviteCode.code}</p>
            </Field>

            <Field label="Ruolo">
              <p className="text-secondary font-semibold">{cfg.label}</p>
            </Field>

            <Field label="Tipo">
              <p className="text-secondary font-semibold">{inviteCode.max_uses === 1 ? "Monouso" : "Riutilizzabile"}</p>
            </Field>

            <Field label="Utilizzi">
              <p className="text-secondary font-semibold">
                {inviteCode.max_uses !== null
                  ? `${inviteCode.uses_remaining ?? 0} / ${inviteCode.max_uses} rimasti`
                  : "Illimitati"}
              </p>
            </Field>

            <Field label="Scadenza">
              <p className="text-secondary font-semibold">
                {inviteCode.expires_at ? fmt(inviteCode.expires_at) : "Nessuna scadenza"}
              </p>
            </Field>

            <Field label="Creato da">
              {creator ? (
                <Link
                  href={`/dashboard/admin/users/${creator.id}`}
                  className="text-secondary font-semibold hover:underline"
                >
                  {creator.full_name || creator.email}
                </Link>
              ) : (
                <p className="text-secondary font-semibold">-</p>
              )}
            </Field>

            <Field label="Data Creazione">
              <p className="text-secondary font-semibold">{fmt(inviteCode.created_at)}</p>
            </Field>

            <Field label="ID Codice">
              <p className="text-secondary font-semibold break-all">{inviteCode.id}</p>
            </Field>

            <Field label="Stato">
              <p className="text-secondary font-semibold">{statusLabel}</p>
            </Field>

          </div>
        </div>
      </div>

      {/* Utilizzatori */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Utilizzatori</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {codeUses.length === 0 ? (
            <p className="text-secondary font-semibold py-2">Non ancora utilizzato</p>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
                <input
                  type="text"
                  placeholder="Cerca per nome o email..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              {(() => {
                const filtered = codeUses.filter((use) => {
                  if (!usersSearch) return true;
                  const q = usersSearch.toLowerCase();
                  return (
                    (use.profile?.full_name || "").toLowerCase().includes(q) ||
                    (use.profile?.email || "").toLowerCase().includes(q)
                  );
                });
                return filtered.length === 0 ? (
                  <p className="text-secondary/60 text-sm py-2">Nessun risultato</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {filtered.map((use) => {
                      const name = use.profile?.full_name || use.profile?.email || use.user_id;
                      const initials = name.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                      return (
                        <li key={use.user_id}>
                          <Link href={`/dashboard/admin/users/${use.user_id}`} className="block">
                            <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                              <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                                <span className="text-sm font-bold text-white leading-none">{initials}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{name}</p>
                                {use.profile?.email && use.profile?.full_name && (
                                  <p className="text-xs text-white/60 truncate mt-0.5">{use.profile.email}</p>
                                )}
                              </div>
                              <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                                {new Date(use.used_at).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Azioni */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={copyLink}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all font-medium"
        >
          {copied ? "Copiato!" : "Copia Link Invito"}
        </button>
        <button
          type="button"
          onClick={handleDisable}
          disabled={disabling || isExpired || isExhausted}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#023b52] rounded-lg hover:bg-[#023b52]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Disattiva
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Elimina
        </button>
      </div>
    </div>
  );
}
