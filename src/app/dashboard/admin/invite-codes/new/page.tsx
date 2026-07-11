"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from 'sonner';

export default function NewInviteCodePage() {
  const router = useRouter();
  const bookingCardClassName = "bg-white border border-black/10 rounded-lg overflow-hidden";
  const bookingCardHeaderClassName = "px-4 sm:px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent";
  const selectionButtonClassName = "w-full px-3 sm:px-5 py-2 text-sm text-center rounded-lg border transition-all";
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

  const expirationOptions = [
    { value: 0, label: "Mai" },
    { value: 1, label: "1" },
    { value: 7, label: "7" },
    { value: 15, label: "15" },
    { value: 30, label: "30" },
    { value: 60, label: "60" },
    { value: 90, label: "90" },
    { value: 180, label: "180" },
  ];

  const maxUsesOptions = [
    { value: 0, label: "Illimitato" },
    { value: 1, label: "1" },
    { value: 5, label: "5" },
    { value: 10, label: "10" },
    { value: 25, label: "25" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
  ];

  async function generateCode() {
    setGenerating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Errore: utente non autenticato");
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
        toast.error(`Errore nella generazione del codice: ${error.message}`);
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

        toast.success("Codice generato con successo!");
        router.push("/dashboard/admin/invite-codes");
      }
    } catch (error: any) {
      console.error("Error generating code:", error);
      toast.error(`Errore: ${error?.message || 'Errore sconosciuto'}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 pt-3">
      <div>
        <p className="breadcrumb text-secondary/60">
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
        <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-secondary">Nuovo Codice Invito</h1>
      </div>

      {/* Form */}
      <div className={bookingCardClassName}>
        <div className={bookingCardHeaderClassName}>
          <h2 className="text-base sm:text-lg font-semibold text-secondary">Impostazioni Codice</h2>
        </div>
        <div className="space-y-6 p-4 sm:p-6">
          {/* Ruolo */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Ruolo *</label>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
              {Object.entries(roleLabels).map(([role, label]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewCodeRole(role)}
                  className={`${selectionButtonClassName} ${
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
            <div className="flex-1 grid grid-cols-8 gap-2">
              {expirationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExpirationDays(option.value)}
                  className={`${selectionButtonClassName} ${
                    expirationDays === option.value
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Numero massimo di utilizzi */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
            <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Numero massimo di utilizzi</label>
            <div className="flex-1 grid grid-cols-7 gap-2">
              {maxUsesOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMaxUses(option.value)}
                  className={`${selectionButtonClassName} ${
                    maxUses === option.value
                      ? 'bg-secondary text-white border-secondary'
                      : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
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
            Genera Codice
          </>
        )}
      </button>
    </div>
  );
}
