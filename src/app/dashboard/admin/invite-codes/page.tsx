"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Ticket, Loader2, Copy, CheckCircle2, XCircle, Plus, Trash2, Search, MoreVertical, Crown, Home, Dumbbell, User, Eye, BanIcon } from "lucide-react";
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
  const router = useRouter();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

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

  async function disableCode(id: string) {
    if (!confirm("Sei sicuro di voler disattivare questo codice invito?")) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("invite_codes").update({ expires_at: now }).eq("id", id);
    if (!error) {
      setCodes((prev) => prev.map((c) => c.id === id ? { ...c, expires_at: now } : c));
    }
  }

  function copyToClipboard(code: string, id: string) {
    const inviteLink = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const closeActionMenu = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const openActionMenu = (codeId: string, buttonRect: DOMRect) => {
    const menuWidth = 176;
    const menuHeight = 140;
    const viewportPadding = 8;

    let left = buttonRect.right - menuWidth;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    let top = buttonRect.bottom + 6;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, buttonRect.top - menuHeight - 6);
    }

    setOpenMenuId(codeId);
    setMenuPosition({ top, left });
  };

  const roleConfig: Record<string, { label: string; bg: string; Icon: React.ElementType }> = {
    admin:   { label: "Admin",   bg: "#023047",          Icon: Crown },
    gestore: { label: "Gestore", bg: "#023047",          Icon: Home },
    maestro: { label: "Maestro", bg: "#05384c",          Icon: Dumbbell },
    atleta:  { label: "Atleta",  bg: "var(--secondary)", Icon: User },
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
      roleConfig[code.role]?.label.toLowerCase().includes(search.toLowerCase());
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
          <h1 className="text-4xl font-bold text-secondary">Codici Invito</h1>
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
        <div className="space-y-2">
          {filteredCodes.map((code) => {
            const { label: roleLabel, bg: cardBg, Icon: RoleIcon } = roleConfig[code.role] || roleConfig.atleta;
            const valid = isCodeValid(code);
            const isExpired = Boolean(code.expires_at && new Date(code.expires_at) <= new Date());
            const isExhausted = Boolean(code.max_uses !== null && code.uses_remaining !== null && code.uses_remaining <= 0);

            const statusLabel = isExpired ? "Scaduto" : isExhausted ? "Esaurito" : "Attivo";

            const createdByLabel = code.creator?.full_name || code.creator?.email || "-";
            const expiresLabel = code.expires_at
              ? new Date(code.expires_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "Nessuna scadenza";
            const usesLabel = code.max_uses !== null
              ? `${code.uses_remaining || 0} / ${code.max_uses}`
              : "Illimitato";

            return (
              <div
                key={code.id}
                className="rounded-lg overflow-visible hover:opacity-95 transition-opacity cursor-pointer"
                style={{ background: cardBg }}
                onClick={() => router.push(`/dashboard/admin/invite-codes/${code.id}`)}
              >
                <div className="flex items-start gap-4 py-3 px-3 sm:items-center">
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                    <RoleIcon className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`font-semibold text-white text-sm truncate ${!valid ? "line-through text-white/60" : ""}`}>
                        {code.code}
                      </p>
                      {copiedId === code.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white/90 flex-shrink-0" />
                      ) : null}
                    </div>
                    <p className="text-xs text-white/60 mt-0.5 truncate">
                      Creato da: {createdByLabel}
                    </p>
                  </div>

                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (openMenuId === code.id) { closeActionMenu(); return; }
                        openActionMenu(code.id, e.currentTarget.getBoundingClientRect());
                      }}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-all focus:outline-none w-8 h-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === code.id && menuPosition && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeActionMenu(); }} />
                        <div
                          className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                          style={{ top: menuPosition.top, left: menuPosition.left }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              router.push(`/dashboard/admin/invite-codes/${code.id}`);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Dettagli
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              copyToClipboard(code.code, code.id);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:bg-gray-50 transition-colors w-full"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copia Link
                          </button>
                          {isCodeValid(code) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              disableCode(code.id);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#023047] hover:bg-[#023047]/10 transition-colors w-full"
                          >
                            <BanIcon className="h-3.5 w-3.5" />
                            Disattiva
                          </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              closeActionMenu();
                              deleteCode(code.id);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#022431] hover:bg-[#022431]/10 transition-colors w-full"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Elimina
                          </button>
                        </div>
                      </>
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
