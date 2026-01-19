"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";

export default function NewInviteCodePage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [newCodeRole, setNewCodeRole] = useState<string>("atleta");
  const [expirationDays, setExpirationDays] = useState<number>(30);
  const [maxUses, setMaxUses] = useState<number>(0); // 0 = illimitato

  const roleLabels: Record<string, string> = {
    admin: "Admin",
    gestore: "Gestore",
    maestro: "Maestro",
    atleta: "Atleta",
  };

  async function generateCode() {
    setGenerating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Errore: utente non autenticato");
        return;
      }

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
        created_by: user.id,
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
        // Log the creation
        await fetch("/api/activity-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "invite_code_created",
            entity_type: "invite_code",
            entity_id: data.id,
            metadata: {
              code: data.code,
              role: data.role,
              max_uses: data.max_uses,
              expires_at: data.expires_at,
            },
          }),
        });

        alert("Codice generato con successo!");
        router.push("/dashboard/admin/invite-codes");
      }
    } catch (error: any) {
      console.error("Error generating code:", error);
      alert(`Errore: ${error?.message || 'Errore sconosciuto'}`);
    } finally {
      setGenerating(false);
    }
  }

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
            <Link
              href="/dashboard/admin/invite-codes"
              className="hover:text-secondary/80 transition-colors"
            >
              Codici Invito
            </Link>
            {" › "}
            <span>Nuovo Codice</span>
          </p>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Crea Nuovo Codice Invito
          </h1>
          <p className="text-secondary/70 font-medium">
            Genera un nuovo codice di invito per registrare utenti sulla piattaforma
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-xl font-bold text-secondary mb-6">Impostazioni Codice</h2>
        
        <div className="space-y-6">
          {/* Ruolo */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Ruolo *</label>
            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
              {Object.entries(roleLabels).map(([role, label]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewCodeRole(role)}
                  className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                    newCodeRole === role
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scadenza dopo */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Scadenza dopo</label>
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
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Numero massimo di utilizzi</label>
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

      {/* Actions */}
      <button
        onClick={generateCode}
        disabled={generating}
        className="w-full px-8 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generazione...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Genera Codice
          </>
        )}
      </button>
    </div>
  );
}
