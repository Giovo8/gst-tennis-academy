"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Ticket, Loader2, Copy, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

type InviteCode = {
  id: string;
  code: string;
  role: string;
  used: boolean;
  used_by: string | null;
  created_at: string;
  expires_at: string | null;
};

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCodeRole, setNewCodeRole] = useState<string>("atleta");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    try {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCodes(data);
      }
    } catch (error) {
      console.error("Error loading codes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateCode() {
    setGenerating(true);
    try {
      const code = `GST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data, error } = await supabase
        .from("invite_codes")
        .insert({ code, role: newCodeRole })
        .select()
        .single();

      if (error) {
        console.error("Error generating code:", error);
        alert(`Errore nella generazione del codice: ${error.message}`);
        return;
      }

      if (data) {
        setCodes((prev) => [data, ...prev]);
        alert("Codice generato con successo!");
      }
    } catch (error: any) {
      console.error("Error generating code:", error);
      alert(`Errore: ${error?.message || 'Errore sconosciuto'}`);
    } finally {
      setGenerating(false);
    }
  }

  async function deleteCode(id: string) {
    const { error } = await supabase.from("invite_codes").delete().eq("id", id);
    if (!error) {
      setCodes((prev) => prev.filter((c) => c.id !== id));
    }
  }

  function copyToClipboard(code: string, id: string) {
    const inviteLink = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getInviteLink(code: string) {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/register?code=${code}`;
  }

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: "Admin", color: "bg-secondary text-white border-0" },
    gestore: { label: "Gestore", color: "bg-secondary text-white border-0" },
    maestro: { label: "Maestro", color: "bg-secondary text-white border-0" },
    atleta: { label: "Atleta", color: "bg-secondary text-white border-0" },
  };

  const stats = {
    total: codes.length,
    available: codes.filter((c) => !c.used).length,
    used: codes.filter((c) => c.used).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/admin/users"
          className="text-xs font-bold text-secondary/60 uppercase tracking-wider hover:text-secondary transition-colors inline-block mb-2"
        >
          Gestione Utenti
        </Link>
        <h1 className="text-3xl font-bold text-secondary mb-2">
          Codici Invito
        </h1>
        <p className="text-secondary/70 font-medium">
          Gestisci i codici di invito per registrare nuovi utenti sulla piattaforma
        </p>
      </div>

      {/* Generate New Code */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-xl font-bold text-secondary mb-4">Genera nuovo codice</h2>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={newCodeRole}
            onChange={(e) => setNewCodeRole(e.target.value)}
            className="px-4 py-2.5 rounded-md bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          >
            <option value="atleta">Atleta</option>
            <option value="maestro">Maestro</option>
            <option value="gestore">Gestore</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={generateCode}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-md text-white bg-secondary hover:opacity-90 font-semibold transition-all disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Genera Codice
          </button>
        </div>
      </div>

      {/* Codes List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento codici...</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Ticket className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun codice</h3>
          <p className="text-secondary/60">Genera il primo codice invito</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => {
            const roleInfo = roleLabels[code.role] || roleLabels.atleta;
            return (
              <div
                key={code.id}
                className={`group rounded-md p-5 transition-all ${
                  code.used
                    ? "bg-secondary/5 opacity-60"
                    : "bg-white hover:bg-secondary/5"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      code.used ? "bg-secondary/5" : "bg-secondary/10"
                    }`}>
                      <Ticket className={`h-6 w-6 ${
                        code.used ? "text-secondary/30" : "text-secondary"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <code className={`text-sm font-mono font-bold ${
                          code.used ? "text-secondary/40 line-through" : "text-secondary"
                        }`}>
                          {code.code}
                        </code>
                        {!code.used && (
                          <button
                            onClick={() => copyToClipboard(code.code, code.id)}
                            className="p-1.5 rounded-md bg-secondary/10 hover:bg-secondary/20 transition-colors"
                            title="Copia link di invito"
                          >
                            {copiedId === code.id ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-secondary" />
                            )}
                          </button>
                        )}
                      </div>
                      {!code.used && (
                        <div className="text-xs text-secondary/70 font-medium mb-1">
                          {getInviteLink(code.code)}
                        </div>
                      )}
                      <p className="text-sm text-secondary/50">
                        {new Date(code.created_at).toLocaleDateString("it-IT")}
                        {code.used && " • Utilizzato"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                    {!code.used && (
                      <button
                        onClick={() => deleteCode(code.id)}
                        className="p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
