"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Ticket, Loader2, Copy, CheckCircle2, XCircle, Plus, Trash2 } from "lucide-react";

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
    admin: { label: "Admin", color: "bg-purple-100 text-purple-700 border-purple-300" },
    gestore: { label: "Gestore", color: "bg-blue-100 text-blue-700 border-blue-300" },
    maestro: { label: "Maestro", color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
    atleta: { label: "Atleta", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  };

  const stats = {
    total: codes.length,
    available: codes.filter((c) => !c.used).length,
    used: codes.filter((c) => c.used).length,
  };

  return (
    <div className="space-y-6" style={{ color: '#111827' }}>
      <div className="max-w-7xl">
        <h1 className="text-3xl font-extrabold text-gray-700 mb-2">
          Codici Invito
        </h1>
        <p className="text-gray-800 font-medium" style={{ color: '#1f2937' }}>Gestisci i codici di invito per nuovi utenti</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Ticket className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>Totali</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.available}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>Disponibili</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <XCircle className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.used}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#374151' }}>Utilizzati</p>
        </div>
      </div>

      {/* Generate New Code */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4">Genera nuovo codice</h2>
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={newCodeRole}
            onChange={(e) => setNewCodeRole(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="atleta">Atleta</option>
            <option value="maestro">Maestro</option>
            <option value="gestore">Gestore</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={generateCode}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 font-semibold transition-all disabled:opacity-50 shadow-sm"
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
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Caricamento codici...</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-gray-200 bg-white">
          <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nessun codice</h3>
          <p className="text-gray-600">Genera il primo codice invito</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => {
            const roleInfo = roleLabels[code.role] || roleLabels.atleta;
            return (
              <div
                key={code.id}
                className={`group rounded-xl border p-5 transition-all ${
                  code.used
                    ? "border-gray-200 bg-gray-50 opacity-60"
                    : "border-gray-200 bg-white hover:shadow-lg hover:border-blue-300"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      code.used ? "bg-gray-100" : "bg-blue-50"
                    }`}>
                      <Ticket className={`h-6 w-6 ${
                        code.used ? "text-gray-400" : "text-blue-600"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <code className={`text-sm font-mono font-semibold ${
                          code.used ? "text-gray-400 line-through" : "text-gray-700"
                        }`}>
                          {code.code}
                        </code>
                        {!code.used && (
                          <button
                            onClick={() => copyToClipboard(code.code, code.id)}
                            className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors"
                            title="Copia link di invito"
                          >
                            {copiedId === code.id ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-blue-600" />
                            )}
                          </button>
                        )}
                      </div>
                      {!code.used && (
                        <div className="text-xs text-blue-600 font-medium mb-1">
                          {getInviteLink(code.code)}
                        </div>
                      )}
                      <p className="text-sm text-gray-500">
                        {new Date(code.created_at).toLocaleDateString("it-IT")}
                        {code.used && " • Utilizzato"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                    {!code.used && (
                      <button
                        onClick={() => deleteCode(code.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100"
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
