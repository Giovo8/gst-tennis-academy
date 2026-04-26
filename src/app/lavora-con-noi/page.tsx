"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Send, Dumbbell, Users, CheckCircle, AlertCircle } from "lucide-react";
import PublicNavbar from "@/components/layout/PublicNavbar";

type RoleOption = "maestro" | "preparatore";

const ALLOWED_CV_DOMAINS = [
  "linkedin.com",
  "drive.google.com",
  "docs.google.com",
  "dropbox.com",
  "onedrive.live.com",
  "1drv.ms",
  "github.com",
];

function validateCvUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "Il link deve usare HTTPS.";
    const hostname = parsed.hostname.replace(/^www\./, "");
    const allowed = ALLOWED_CV_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d));
    if (!allowed) return "Dominio non consentito. Usa LinkedIn, Google Drive, Dropbox o OneDrive.";
    return null;
  } catch {
    return "Inserisci un URL valido (es. https://...)";
  }
}

export default function WorkWithUsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleOption>("maestro");
  const [message, setMessage] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cvUrlError, setCvUrlError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCvUrlError(null);

    const cvErr = validateCvUrl(cvUrl);
    if (cvErr) {
      setCvUrlError(cvErr);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase.from("recruitment_applications").insert({
      full_name: fullName,
      email,
      role,
      message,
      cv_url: cvUrl,
      status: "pending",
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
    <div className="min-h-screen bg-gray-50/50">
      <PublicNavbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3 text-secondary">
            Entra nel Team
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-secondary leading-[1.05] tracking-tight">
            Lavora con noi
          </h1>
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl leading-relaxed">
            Unisciti al team GST Tennis Academy! Cerchiamo professionisti appassionati
            per far crescere la nostra community sportiva.
          </p>
        </div>

        {/* Posizioni Aperte - Card stile admin */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-6">
          <div className="bg-white rounded-lg p-5 border border-gray-200 border-l-4 border-l-secondary hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex rounded-full bg-secondary/10 p-2.5">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-secondary">Maestri di Tennis</h3>
            </div>
            <p className="text-sm text-secondary/70 mb-4">
              Istruttori certificati FITP con esperienza nell&apos;insegnamento a tutte le età.
            </p>
            <ul className="space-y-2 text-sm text-secondary/80">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary/60 flex-shrink-0" />
                Certificazione FITP richiesta
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary/60 flex-shrink-0" />
                Esperienza con bambini e adulti
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary/60 flex-shrink-0" />
                Disponibilità part-time/full-time
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200 border-l-4 border-l-secondary hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex rounded-full bg-secondary/10 p-2.5">
                <Dumbbell className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-secondary">Preparatore Fisico</h3>
            </div>
            <p className="text-sm text-secondary/70 mb-4">
              Professionisti della preparazione atletica per tennisti.
            </p>
            <ul className="space-y-2 text-sm text-secondary/80">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary/60 flex-shrink-0" />
                Laurea in Scienze Motorie
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary/60 flex-shrink-0" />
                Esperienza con atleti agonisti
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary/60 flex-shrink-0" />
                Conoscenza metodologie di allenamento
              </li>
            </ul>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Errore</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Successo</p>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Form Candidatura - stile admin users/new */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dati Personali */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Dati Personali</h2>
            </div>
            <div className="p-6">
            <div className="space-y-0">
              {/* Nome Completo */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Nome Completo *
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Mario Rossi"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200 pt-6">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Email *
                </label>
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="mario.rossi@email.it"
                    required
                  />
                </div>
              </div>

              {/* Posizione */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pt-6">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Posizione *
                </label>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("maestro")}
                      className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        role === "maestro"
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      Maestro di Tennis
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("preparatore")}
                      className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        role === "preparatore"
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white text-secondary border-gray-300 hover:border-secondary"
                      }`}
                    >
                      Preparatore Fisico
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Candidatura */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Candidatura</h2>
            </div>
            <div className="p-6">
            <div className="space-y-0">
              {/* Link CV */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Link CV
                </label>
                <div className="flex-1">
                  <input
                    type="url"
                    value={cvUrl}
                    onChange={(e) => { setCvUrl(e.target.value); setCvUrlError(null); }}
                    className={`w-full px-4 py-2 text-sm rounded-lg border bg-white text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 ${
                      cvUrlError ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="https://drive.google.com/... o LinkedIn"
                  />
                  {cvUrlError ? (
                    <p className="text-xs text-red-500 mt-2">{cvUrlError}</p>
                  ) : (
                    <p className="text-xs text-secondary/50 mt-2">
                      Accettiamo link da LinkedIn, Google Drive, Dropbox o OneDrive
                    </p>
                  )}
                </div>
              </div>

              {/* Presentazione */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pt-6">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
                  Presentazione
                </label>
                <div className="flex-1">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                    placeholder="Parlaci delle tue esperienze, certificazioni, disponibilità e motivazioni..."
                  />
                </div>
              </div>
            </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-4 text-base font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Invio in corso...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Invia candidatura
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
