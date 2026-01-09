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
  max_uses: number | null;
  uses_remaining: number | null;
};

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCodeRole, setNewCodeRole] = useState<string>("atleta");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expirationDays, setExpirationDays] = useState<number>(30);
  const [maxUses, setMaxUses] = useState<number>(0); // 0 = illimitato

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
      
      // Calcola la data di scadenza se specificata
      let expiresAt = null;
      if (expirationDays > 0) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + expirationDays);
        expiresAt = expDate.toISOString();
      }

      const insertData: any = {
        code,
        role: newCodeRole,
        expires_at: expiresAt,
      };

      // Se ha un limite di utilizzi, imposta max_uses e uses_remaining
      if (maxUses > 0) {
        insertData.max_uses = maxUses;
        insertData.uses_remaining = maxUses;
      }

      const { data, error } = await supabase
        .from("invite_codes")
        .insert(insertData)
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
    available: codes.filter((c) => {
      const notExpired = !c.expires_at || new Date(c.expires_at) > new Date();
      const hasUsesLeft = c.max_uses === null || (c.uses_remaining !== null && c.uses_remaining > 0);
      return notExpired && hasUsesLeft;
    }).length,
    used: codes.filter((c) => {
      const expired = c.expires_at && new Date(c.expires_at) <= new Date();
      const noUsesLeft = c.max_uses !== null && c.uses_remaining !== null && c.uses_remaining <= 0;
      return expired || noUsesLeft;
    }).length,
  };

  // Helper per verificare se un codice è ancora valido
  const isCodeValid = (code: InviteCode) => {
    const notExpired = !code.expires_at || new Date(code.expires_at) > new Date();
    const hasUsesLeft = code.max_uses === null || (code.uses_remaining !== null && code.uses_remaining > 0);
    return notExpired && hasUsesLeft;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            <Link
              href="/dashboard/admin/users"
              className="hover:text-secondary/80 transition-colors"
            >
              Gestione Utenti
            </Link>
            <span className="mx-2">›</span>
            <span>Codici Invito</span>
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Codici Invito
          </h1>
          <p className="text-secondary/70 font-medium">
            Gestisci i codici di invito per registrare nuovi utenti sulla piattaforma
          </p>
        </div>
      </div>

      {/* Generate New Code */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Crea nuovo codice invito</h2>
        
        <div className="space-y-6">
          {/* Ruolo */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Ruolo *</label>
            <div className="flex-1 flex gap-3">
              {Object.entries(roleLabels).map(([role, info]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewCodeRole(role)}
                  className={`px-5 py-2 text-sm rounded-lg border transition-all ${
                    newCodeRole === role
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                  }`}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scadenza dopo */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Scadenza dopo</label>
            <div className="flex-1">
              <select
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              >
                <option value="0">Mai</option>
                <option value="1">1 giorno</option>
                <option value="7">7 giorni</option>
                <option value="15">15 giorni</option>
                <option value="30">30 giorni</option>
                <option value="60">60 giorni</option>
                <option value="90">90 giorni</option>
                <option value="180">180 giorni</option>
                <option value="365">1 anno</option>
              </select>
              {expirationDays > 0 && (
                <p className="text-xs text-secondary/50 mt-2">
                  Il codice scadrà il {new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Numero massimo di utilizzi */}
          <div className="flex items-start gap-8">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Numero massimo di utilizzi</label>
            <div className="flex-1">
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              >
                <option value="0">Nessun limite</option>
                <option value="1">1 uso</option>
                <option value="5">5 usi</option>
                <option value="10">10 usi</option>
                <option value="25">25 usi</option>
                <option value="50">50 usi</option>
                <option value="100">100 usi</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pulsante Genera - sopra la tabella */}
      <button
        onClick={generateCode}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white bg-secondary hover:opacity-90 font-semibold transition-all disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generazione...
          </>
        ) : (
          <>
            <Plus className="w-5 h-5" />
            Genera Codice
          </>
        )}
      </button>

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
          {/* Header Row */}
          <div className="bg-white rounded-lg px-5 py-3 mb-3">
            <div className="flex items-center gap-4">
              <div className="w-10 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-secondary/60 uppercase">#</div>
              </div>
              <div className="w-40 flex-shrink-0">
                <div className="text-xs font-bold text-secondary/60 uppercase">Codice</div>
              </div>
              <div className="w-28 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-secondary/60 uppercase">Ruolo</div>
              </div>
              <div className="w-32 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-secondary/60 uppercase">Tipo</div>
              </div>
              <div className="w-32 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-secondary/60 uppercase">Scadenza</div>
              </div>
              <div className="w-28 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-secondary/60 uppercase">Utilizzi</div>
              </div>
              <div className="w-28 flex-shrink-0 flex justify-center">
                <div className="text-xs font-bold text-secondary/60 uppercase">Stato</div>
              </div>
              <div className="flex-1"></div>
            </div>
          </div>

          {/* Data Rows */}
          {codes.map((code) => {
            const roleInfo = roleLabels[code.role] || roleLabels.atleta;
            const valid = isCodeValid(code);
            const isExpired = code.expires_at && new Date(code.expires_at) <= new Date();
            const isExhausted = code.max_uses !== null && code.uses_remaining !== null && code.uses_remaining <= 0;
            
            // Determina il colore del bordo in base allo stato
            let borderColor = "#10b981"; // emerald - valido
            if (isExpired) {
              borderColor = "#ef4444"; // red - scaduto
            } else if (isExhausted) {
              borderColor = "#f59e0b"; // amber - esaurito
            }

            return (
              <div
                key={code.id}
                className="bg-white rounded-md p-5 hover:shadow-md transition-all border-l-4"
                style={{ borderLeftColor: borderColor }}
              >
                <div className="flex items-center gap-4">
                  {/* Icona */}
                  <div className="w-10 flex-shrink-0 flex justify-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      valid ? "bg-secondary/10" : "bg-secondary/5"
                    }`}>
                      <Ticket className={`h-5 w-5 ${
                        valid ? "text-secondary" : "text-secondary/30"
                      }`} />
                    </div>
                  </div>

                  {/* Codice */}
                  <div className="w-40 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <code className={`text-sm font-mono font-bold ${
                        valid ? "text-secondary" : "text-secondary/40 line-through"
                      }`}>
                        {code.code}
                      </code>
                      {valid && (
                        <button
                          onClick={() => copyToClipboard(code.code, code.id)}
                          className="p-1 rounded-md bg-secondary/10 hover:bg-secondary/20 transition-colors"
                          title="Copia link di invito"
                        >
                          {copiedId === code.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-secondary" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ruolo */}
                  <div className="w-28 flex-shrink-0 flex justify-center">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>

                  {/* Tipo */}
                  <div className="w-32 flex-shrink-0 flex justify-center">
                    <span className="text-sm text-secondary/70">
                      {code.max_uses === 1 ? "Monouso" : "Riutilizzabile"}
                    </span>
                  </div>

                  {/* Scadenza */}
                  <div className="w-32 flex-shrink-0 flex justify-center">
                    {code.expires_at ? (
                      <span className={`text-sm ${
                        isExpired ? "text-red-600 font-semibold" : "text-secondary/70"
                      }`}>
                        {new Date(code.expires_at).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-secondary/30">Nessuna</span>
                    )}
                  </div>

                  {/* Utilizzi */}
                  <div className="w-28 flex-shrink-0 flex justify-center">
                    {code.max_uses !== null ? (
                      <span className={`text-sm font-semibold ${
                        isExhausted ? "text-red-600" : "text-secondary"
                      }`}>
                        {code.uses_remaining || 0} / {code.max_uses}
                      </span>
                    ) : (
                      <span className="text-sm text-secondary/30">∞</span>
                    )}
                  </div>

                  {/* Stato */}
                  <div className="w-28 flex-shrink-0 flex justify-center">
                    {isExpired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold">
                        <XCircle className="w-3 h-3" />
                        Scaduto
                      </span>
                    ) : isExhausted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
                        <XCircle className="w-3 h-3" />
                        Esaurito
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Attivo
                      </span>
                    )}
                  </div>

                  {/* Azioni */}
                  <div className="flex-1 flex justify-end">
                    {valid && (
                      <button
                        onClick={() => deleteCode(code.id)}
                        className="p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                        title="Elimina codice"
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
