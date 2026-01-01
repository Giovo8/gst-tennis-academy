"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Send, Briefcase, Users, CheckCircle } from "lucide-react";

type RoleOption = "maestro" | "personale";

export default function WorkWithUsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleOption>("maestro");
  const [message, setMessage] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error: insertError } = await supabase.from("recruitment_applications").insert({
      full_name: fullName,
      email,
      role,
      message,
      cv_url: cvUrl,
    });

    if (insertError) {
      setError("Invio non riuscito. Riprova più tardi.");
      setLoading(false);
      return;
    }

    setSuccess("Candidatura inviata con successo! Ti contatteremo presto.");
    setFullName("");
    setEmail("");
    setMessage("");
    setCvUrl("");
    setRole("maestro");
    setLoading(false);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 sm:gap-8 md:gap-10 px-6 sm:px-8 py-10 sm:py-12 md:py-16 bg-[#021627]">
      {/* Header Section */}
      <div className="space-y-3 sm:space-y-4 text-center">
        <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-accent">Entra nel Team</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Lavora con noi</h1>
        <p className="text-base sm:text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
          Unisciti al team GST Tennis Academy! Cerchiamo professionisti appassionati 
          per far crescere la nostra community sportiva.
        </p>
      </div>

      {/* Posizioni Aperte */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        <div className="rounded-xl sm:rounded-2xl border border-[#2f7de1]/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 sm:p-6">
          <div className="mb-3 sm:mb-4 inline-flex rounded-full bg-blue-500/20 p-2 sm:p-3">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Maestri di Tennis</h3>
          <p className="text-xs sm:text-sm text-muted mb-3 sm:mb-4">
            Istruttori certificati FIT con esperienza nell'insegnamento a tutte le età.
            Passione per il tennis e ottime capacità comunicative.
          </p>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-300" />
              Certificazione FIT richiesta
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-300" />
              Esperienza con bambini e adulti
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-300" />
              Disponibilità part-time/full-time
            </li>
          </ul>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-[#2f7de1]/30 bg-gradient-to-br from-cyan-500/10 to-purple-500/5 p-4 sm:p-6">
          <div className="mb-3 sm:mb-4 inline-flex rounded-full bg-cyan-500/20 p-2 sm:p-3">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Personale di Campo</h3>
          <p className="text-xs sm:text-sm text-muted mb-3 sm:mb-4">
            Addetti all'accoglienza, gestione campi e supporto operativo. 
            Attitudine al lavoro in team e orientamento al cliente.
          </p>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-300" />
              Accoglienza e front office
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-300" />
              Gestione prenotazioni
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-300" />
              Manutenzione ordinaria campi
            </li>
          </ul>
        </div>
      </div>

      {/* Form Candidatura */}
      <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white mb-2">Invia la tua candidatura</h2>
          <p className="text-sm text-muted">
            Compila il form con i tuoi dati. Il nostro team valuterà il tuo profilo e ti contatterà.
          </p>
        </div>
        <form className="grid gap-6 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm text-white sm:col-span-2">
            Nome completo *
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d1f35]/80 px-4 py-3 text-white outline-none focus:border-accent transition placeholder:text-muted"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mario Rossi"
              required
            />
          </label>
          <label className="text-sm text-white">
            Email *
            <input
              type="email"
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d1f35]/80 px-4 py-3 text-white outline-none focus:border-accent transition placeholder:text-muted"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario.rossi@email.it"
              required
            />
          </label>
          <label className="text-sm text-white">
            Posizione *
            <select
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d1f35]/80 px-4 py-3 text-white outline-none focus:border-accent transition"
              value={role}
              onChange={(e) => setRole(e.target.value as RoleOption)}
            >
              <option value="maestro">Maestro di Tennis</option>
              <option value="personale">Personale di Campo</option>
            </select>
          </label>
          <label className="text-sm text-white sm:col-span-2">
            Link CV (opzionale)
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d1f35]/80 px-4 py-3 text-white outline-none focus:border-accent transition placeholder:text-muted"
              value={cvUrl}
              onChange={(e) => setCvUrl(e.target.value)}
              placeholder="https://drive.google.com/... o LinkedIn"
            />
          </label>
          <label className="text-sm text-white sm:col-span-2">
            Presentazione
            <textarea
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#0d1f35]/80 px-4 py-3 text-white outline-none focus:border-accent transition placeholder:text-muted"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Parlaci delle tue esperienze, certificazioni, disponibilità e motivazioni..."
              rows={5}
            />
          </label>
          <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold bg-accent text-[#06101f] transition hover:bg-[#5fc7e0] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Invio in corso..." : "Invia candidatura"}
            </button>
            {success && (
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <CheckCircle className="h-4 w-4" />
                {success}
              </div>
            )}
            {error && <span className="text-sm text-cyan-300">{error}</span>}
          </div>
        </form>
      </div>
    </main>
  );
}


