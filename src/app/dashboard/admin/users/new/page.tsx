"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function NewUserPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    date_of_birth: "",
    birth_city: "",
    fiscal_code: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    arena_rank: "Bronzo" as "Bronzo" | "Argento" | "Oro" | "Platino" | "Diamante",
    notes: "",
    role: "atleta" as "admin" | "gestore" | "maestro" | "atleta"
  });

  const roleLabels = {
    admin: { label: "Admin", description: "Accesso completo al sistema" },
    gestore: { label: "Gestore", description: "Gestione operativa e prenotazioni" },
    maestro: { label: "Maestro", description: "Gestione lezioni e allievi" },
    atleta: { label: "Atleta", description: "Accesso base per utenti" },
  };

  // Validazione email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!newUser.email || !newUser.password || !newUser.full_name) {
      setError("Compila tutti i campi obbligatori");
      return;
    }

    if (!emailRegex.test(newUser.email)) {
      setError("Inserisci un indirizzo email valido (es: utente@esempio.com)");
      return;
    }

    if (newUser.password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri");
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      // Crea l'utente con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            phone: newUser.phone,
            role: newUser.role
          }
        }
      });

      if (authError) throw authError;

      // Attendi che il trigger crei il profilo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Aggiorna il profilo con il ruolo (usa upsert per sicurezza)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            full_name: newUser.full_name,
            phone: newUser.phone,
            date_of_birth: newUser.date_of_birth || null,
            bio: newUser.notes || null,
            role: newUser.role,
            email: newUser.email,
            metadata: {
              birth_city: newUser.birth_city,
              fiscal_code: newUser.fiscal_code,
              address: newUser.address,
              city: newUser.city,
              province: newUser.province,
              postal_code: newUser.postal_code
            }
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error("Errore aggiornamento profilo:", profileError);
        }

        // Inizializza arena_stats con il rank selezionato
        const rankPoints = {
          "Bronzo": 0,
          "Argento": 800,
          "Oro": 1500,
          "Platino": 2000,
          "Diamante": 2500
        };

        const { error: arenaError } = await supabase
          .from("arena_stats")
          .upsert({
            user_id: authData.user.id,
            points: rankPoints[newUser.arena_rank],
            level: newUser.arena_rank,
            wins: 0,
            losses: 0,
            total_matches: 0
          }, {
            onConflict: 'user_id'
          });

        if (arenaError) {
          console.error("Errore inizializzazione arena:", arenaError);
        }
      }

      setSuccess("Utente creato con successo!");
      
      // Attendi un attimo prima di reindirizzare
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.push("/dashboard/admin/users");
    } catch (error: any) {
      console.error("Error creating user:", error);
      setError(error.message || "Errore durante la creazione dell'utente");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
            <Link
              href="/dashboard/admin/users"
              className="hover:text-secondary/80 transition-colors"
            >
              Anagrafica Utenti
            </Link>
            <span className="mx-2">›</span>
            <span>Crea Utente</span>
          </div>
          <h1 className="text-3xl font-bold text-secondary">Crea nuovo utente</h1>
          <p className="text-secondary/70 text-sm mt-1 max-w-2xl">
            Inserisci i dati per creare un nuovo account utente
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-2">
          <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Errore</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mt-2">
          <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-900">Successo</p>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome Completo */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Nome Completo *
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                placeholder="Mario Rossi"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Email *
            </label>
            <div className="flex-1">
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                placeholder="utente@esempio.com"
                required
              />
              <p className="text-xs text-secondary/50 mt-2">
                Assicurati che l'email abbia un dominio valido (es: @esempio.com)
              </p>
            </div>
          </div>

          {/* Telefono */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Telefono
            </label>
            <div className="flex-1">
              <input
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                placeholder="+39 123 456 7890"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Password *
            </label>
            <div className="flex-1">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 pr-12"
                  placeholder="Minimo 6 caratteri"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-secondary transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-secondary/50 mt-2">
                La password deve contenere almeno 6 caratteri
              </p>
            </div>
          </div>

          {/* Data di nascita */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Data di Nascita
            </label>
            <div className="flex-1">
              <input
                type="date"
                value={newUser.date_of_birth}
                onChange={(e) => setNewUser({ ...newUser, date_of_birth: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
              />
            </div>
          </div>

          {/* Città di Nascita */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Città di Nascita
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={newUser.birth_city}
                onChange={(e) => setNewUser({ ...newUser, birth_city: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                placeholder="Roma"
              />
            </div>
          </div>

          {/* Codice Fiscale */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Codice Fiscale
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={newUser.fiscal_code}
                onChange={(e) => setNewUser({ ...newUser, fiscal_code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 uppercase"
                placeholder="RSSMRA80A01H501U"
                maxLength={16}
              />
            </div>
          </div>

          {/* Residenza - Indirizzo */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Indirizzo
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                placeholder="Via Roma, 123"
              />
            </div>
          </div>

          {/* Residenza - Città, Provincia, CAP */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Città / Provincia / CAP
            </label>
            <div className="flex-1 flex gap-3">
              <input
                type="text"
                value={newUser.city}
                onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
                className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                placeholder="Milano"
              />
              <input
                type="text"
                value={newUser.province}
                onChange={(e) => setNewUser({ ...newUser, province: e.target.value.toUpperCase() })}
                className="w-20 px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 uppercase text-center"
                placeholder="MI"
                maxLength={2}
              />
              <input
                type="text"
                value={newUser.postal_code}
                onChange={(e) => setNewUser({ ...newUser, postal_code: e.target.value })}
                className="w-28 px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                placeholder="20100"
                maxLength={5}
              />
            </div>
          </div>

          {/* Rank Arena */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Rank Arena Iniziale
            </label>
            <div className="flex-1">
              <div className="flex gap-2">
                {[
                  { value: "Bronzo", points: "0 punti" },
                  { value: "Argento", points: "800 punti" },
                  { value: "Oro", points: "1500 punti" },
                  { value: "Platino", points: "2000 punti" },
                  { value: "Diamante", points: "2500 punti" }
                ].map((rank) => (
                  <button
                    key={rank.value}
                    type="button"
                    onClick={() => setNewUser({ ...newUser, arena_rank: rank.value as any })}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                      newUser.arena_rank === rank.value
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                    }`}
                  >
                    <div className="font-semibold">{rank.value}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-secondary/50 mt-2">
                Imposta il livello Arena di partenza per questo utente
              </p>
            </div>
          </div>

          {/* Note */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Note
            </label>
            <div className="flex-1">
              <textarea
                value={newUser.notes}
                onChange={(e) => setNewUser({ ...newUser, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                placeholder="Informazioni aggiuntive, problemi di salute, preferenze..."
              />
            </div>
          </div>

          {/* Ruolo */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">
              Ruolo *
            </label>
            <div className="flex-1">
              <div className="flex gap-2">
                {Object.entries(roleLabels).map(([role, info]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setNewUser({ ...newUser, role: role as any })}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                      newUser.role === role
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                    }`}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={creating}
              className="px-8 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Crea Utente
                </>
              )}
            </button>
            <Link
              href="/dashboard/admin/users"
              className="px-8 py-3 text-sm font-semibold text-secondary/70 bg-white border-2 border-secondary/20 rounded-lg hover:border-secondary/40 transition-all"
            >
              Annulla
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
