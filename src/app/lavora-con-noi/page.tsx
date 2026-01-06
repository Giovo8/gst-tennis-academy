"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Send, Dumbbell, Users, CheckCircle } from "lucide-react";
import PublicNavbar from "@/components/layout/PublicNavbar";
import PromoBanner from "@/components/layout/PromoBanner";

type RoleOption = "maestro" | "preparatore";

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
    <div className="min-h-screen bg-white">

      <PublicNavbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        {/* Header Section */}
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-secondary/60 mb-3">
            Entra nel Team
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-4">
            Lavora con noi
          </h1>
          <p className="text-base sm:text-lg text-secondary/80 max-w-3xl mx-auto leading-relaxed">
            Unisciti al team GST Tennis Academy! Cerchiamo professionisti appassionati 
            per far crescere la nostra community sportiva.
          </p>
        </div>

        {/* Posizioni Aperte */}
        <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 mb-12 sm:mb-16">
          <div className="border-l-4 border-secondary pl-6 bg-secondary/5 p-6 rounded-r-md">
            <div className="mb-4 inline-flex rounded-full bg-secondary/10 p-3">
              <Users className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-secondary mb-3">Maestri di Tennis</h3>
            <p className="text-sm sm:text-base text-secondary/70 mb-4">
              Istruttori certificati FITP con esperienza nell'insegnamento a tutte le età.
              Passione per il tennis e ottime capacità comunicative.
            </p>
            <ul className="space-y-2 text-sm text-secondary/80">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-secondary" />
                Certificazione FITP richiesta
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-secondary" />
                Esperienza con bambini e adulti
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-secondary" />
                Disponibilità part-time/full-time
              </li>
            </ul>
          </div>

          <div className="border-l-4 border-secondary pl-6 bg-secondary/5 p-6 rounded-r-md">
            <div className="mb-4 inline-flex rounded-full bg-secondary/10 p-3">
              <Dumbbell className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-secondary mb-3">Preparatore Fisico</h3>
            <p className="text-sm sm:text-base text-secondary/70 mb-4">
              Professionisti della preparazione atletica per tennisti. 
              Esperienza in allenamento funzionale e prevenzione infortuni.
            </p>
            <ul className="space-y-2 text-sm text-secondary/80">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-secondary" />
                Laurea in Scienze Motorie
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-secondary" />
                Esperienza con atleti agonisti
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-secondary" />
                Conoscenza metodologie di allenamento
              </li>
            </ul>
          </div>
        </div>

        {/* Form Candidatura */}
        <div className="bg-white border-2 border-secondary/20 rounded-md p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-secondary mb-3">Invia la tua candidatura</h2>
            <p className="text-sm sm:text-base text-secondary/70">
              Compila il form con i tuoi dati. Il nostro team valuterà il tuo profilo e ti contatterà.
            </p>
          </div>
          <form className="grid gap-6 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="text-sm font-semibold text-secondary sm:col-span-2">
              Nome completo *
              <input
                className="mt-2 w-full rounded-md border-2 border-secondary/20 bg-white px-4 py-3 text-secondary outline-none focus:border-secondary transition placeholder:text-secondary/40"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Mario Rossi"
                required
              />
            </label>
            <label className="text-sm font-semibold text-secondary">
              Email *
              <input
                type="email"
                className="mt-2 w-full rounded-md border-2 border-secondary/20 bg-white px-4 py-3 text-secondary outline-none focus:border-secondary transition placeholder:text-secondary/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mario.rossi@email.it"
                required
              />
            </label>
            <label className="text-sm font-semibold text-secondary">
              Posizione *
              <select
                className="mt-2 w-full rounded-md border-2 border-secondary/20 bg-white px-4 py-3 text-secondary outline-none focus:border-secondary transition"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleOption)}
              >
                <option value="maestro">Maestro di Tennis</option>
                <option value="preparatore">Preparatore Fisico</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-secondary sm:col-span-2">
              Link CV (opzionale)
              <input
                className="mt-2 w-full rounded-md border-2 border-secondary/20 bg-white px-4 py-3 text-secondary outline-none focus:border-secondary transition placeholder:text-secondary/40"
                value={cvUrl}
                onChange={(e) => setCvUrl(e.target.value)}
                placeholder="https://drive.google.com/... o LinkedIn"
              />
            </label>
            <label className="text-sm font-semibold text-secondary sm:col-span-2">
              Presentazione
              <textarea
                className="mt-2 w-full rounded-md border-2 border-secondary/20 bg-white px-4 py-3 text-secondary outline-none focus:border-secondary transition placeholder:text-secondary/40"
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
                className="inline-flex items-center justify-center gap-2 rounded-md px-8 py-3 text-sm font-semibold bg-secondary text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? "Invio in corso..." : "Invia candidatura"}
              </button>
              {success && (
                <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                  <CheckCircle className="h-5 w-5" />
                  {success}
                </div>
              )}
              {error && <span className="text-sm text-red-600 font-medium">{error}</span>}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}


