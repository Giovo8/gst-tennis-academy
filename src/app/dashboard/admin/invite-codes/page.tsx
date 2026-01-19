"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Ticket, Loader2, Copy, CheckCircle2, XCircle, Plus, Trash2, Search } from "lucide-react";
import Link from "next/link";

type InviteCode = {
  id: string;
  code: string;
  role: string;
  used_by: string | null;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_remaining: number | null;
  created_by: string | null;
  creator?: {
    full_name: string;
    email: string;
  } | null;
};

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    try {
      // Prima carica i codici
      const { data: codesData, error: codesError } = await supabase
        .from("invite_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (codesError) {
        console.error("Error loading codes:", codesError);
        return;
      }

      if (!codesData || codesData.length === 0) {
        setCodes([]);
        return;
      }

      // Poi carica i profili dei creatori
      const creatorIds = codesData
        .map(code => code.created_by)
        .filter(id => id != null);

      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", creatorIds);

        // Mappa i profili ai codici
        const codesWithCreators = codesData.map(code => ({
          ...code,
          creator: profilesData?.find(p => p.id === code.created_by) || null
        }));

        setCodes(codesWithCreators);
      } else {
        setCodes(codesData);
      }
    } catch (error) {
      console.error("Error loading codes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCode(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questo codice invito?")) return;
    
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

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    gestore: "Gestore",
    maestro: "Maestro",
    atleta: "Atleta",
  };

  // Helper per verificare se un codice è ancora valido
  const isCodeValid = (code: InviteCode) => {
    const notExpired = !code.expires_at || new Date(code.expires_at) > new Date();
    const hasUsesLeft = code.max_uses === null || (code.uses_remaining !== null && code.uses_remaining > 0);
    return notExpired && hasUsesLeft;
  };

  const stats = {
    total: codes.length,
    available: codes.filter((c) => isCodeValid(c)).length,
  };

  // Filtra i codici in base alla ricerca
  const filteredCodes = codes.filter((code) => {
    const matchesSearch =
      !search ||
      code.code.toLowerCase().includes(search.toLowerCase()) ||
      roleLabels[code.role]?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="breadcrumb text-secondary/60 mb-1">
            <Link
              href="/dashboard/admin/users"
              className="hover:text-secondary/80 transition-colors"
            >
              Gestione Utenti
            </Link>
            {" › "}
            <span>Codici Invito</span>
          </p>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Codici Invito
          </h1>
          <p className="text-secondary/70 font-medium">
            Gestisci i codici di invito per registrare nuovi utenti sulla piattaforma
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/dashboard/admin/invite-codes/new"
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-secondary rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crea Codice
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
        <input
          type="text"
          placeholder="Cerca per codice o ruolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-md bg-white border border-gray-200 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Codes List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento codici...</p>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="text-center py-20 rounded-md bg-white">
          <Ticket className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {search ? "Nessun codice trovato" : "Nessun codice"}
          </h3>
          <p className="text-secondary/60">
            {search ? "Prova a modificare la ricerca" : "Genera il primo codice invito"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="space-y-3 min-w-[1050px]">
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
              <div className="grid grid-cols-[40px_140px_100px_100px_120px_100px_120px_1fr_80px_56px] items-center gap-4">
                <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
                <div className="text-xs font-bold text-white/80 uppercase">Codice</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Ruolo</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Tipo</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Scadenza</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Utilizzi</div>
                <div className="text-xs font-bold text-white/80 uppercase">Creato da</div>
                <div></div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Stato</div>
                <div className="text-xs font-bold text-white/80 uppercase text-center">Azioni</div>
              </div>
            </div>

            {/* Data Rows */}
            {filteredCodes.map((code) => {
              const roleLabel = roleLabels[code.role] || roleLabels.atleta;
              const valid = isCodeValid(code);
              const isExpired = code.expires_at && new Date(code.expires_at) <= new Date();
              const isExhausted = code.max_uses !== null && code.uses_remaining !== null && code.uses_remaining <= 0;
              
              // Determina il colore del bordo in base allo stato (frozen-lake palette come bookings)
              let borderStyle = {};
              let statusColor = "";
              if (isExpired) {
                borderStyle = { borderLeftColor: "#022431" }; // frozen-900 - scaduto
                statusColor = "#022431";
              } else if (isExhausted) {
                borderStyle = { borderLeftColor: "#056c94" }; // frozen-700 - esaurito
                statusColor = "#056c94";
              } else {
                borderStyle = { borderLeftColor: "#08b3f7" }; // frozen-500 - attivo
                statusColor = "#08b3f7";
              }

              return (
                <div
                  key={code.id}
                  className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all border-l-4"
                  style={borderStyle}
                >
                  <div className="grid grid-cols-[40px_140px_100px_100px_120px_100px_120px_1fr_80px_56px] items-center gap-4">
                    {/* Icona */}
                    <div className="flex items-center justify-center">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        valid ? "bg-secondary/10" : "bg-secondary/5"
                      }`}>
                        <Ticket className={`h-5 w-5 ${
                          valid ? "text-secondary" : "text-secondary/30"
                        }`} />
                      </div>
                    </div>

                    {/* Codice */}
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

                    {/* Ruolo */}
                    <div className="flex justify-center">
                      <span className="text-sm text-secondary font-semibold">
                        {roleLabel}
                      </span>
                    </div>

                    {/* Tipo */}
                    <div className="flex justify-center">
                      <span className="text-sm text-secondary/70 font-semibold">
                        {code.max_uses === 1 ? "Monouso" : "Riutilizzabile"}
                      </span>
                    </div>

                    {/* Scadenza */}
                    <div className="flex justify-center">
                      {code.expires_at ? (
                        <span className={`text-sm font-semibold ${
                          isExpired ? "text-red-600" : "text-secondary"
                        }`}>
                          {new Date(code.expires_at).toLocaleDateString("it-IT", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-secondary/30">-</span>
                      )}
                    </div>

                    {/* Utilizzi */}
                    <div className="flex justify-center">
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

                    {/* Creato da */}
                    <div>
                      <span className="text-sm text-secondary font-semibold truncate block">
                        {code.creator?.full_name || "-"}
                      </span>
                    </div>

                    {/* Spazio flessibile */}
                    <div></div>

                    {/* Stato */}
                    <div className="flex items-center justify-center gap-1">
                      {isExpired ? (
                        <XCircle className="h-4 w-4" style={{ color: statusColor }} />
                      ) : isExhausted ? (
                        <XCircle className="h-4 w-4" style={{ color: statusColor }} />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
                      )}
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteCode(code.id);
                        }}
                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-all focus:outline-none w-8 h-8"
                        title="Elimina codice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
