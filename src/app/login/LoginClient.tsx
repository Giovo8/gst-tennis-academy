"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getDestinationForRole, type UserRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase/client";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Login con Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        throw new Error("Email o password non corretti");
      }

      const user = data.user;
      if (!user) {
        throw new Error("Utente non trovato");
      }

      // 2. Carica profilo dal database
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        // Errore durante il caricamento del profilo
        console.error("Errore profilo:", profileError);
        await supabase.auth.signOut();
        throw new Error(`Errore accesso: ${profileError.message || "Profilo non configurato"}`);
      }

      if (!profile) {
        // Profilo non trovato - logout e mostra errore
        await supabase.auth.signOut();
        throw new Error("Profilo non configurato. Contatta l'amministratore.");
      }

      // 3. Reindirizza in base al ruolo
      const destination = getDestinationForRole(profile.role as UserRole);
      router.push(destination);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'accesso");
      setLoading(false);
    }
  };

  return (
    <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-8 px-6 py-16">
      <div className="mx-auto w-full max-w-md">
      {/* Animated background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-20 h-64 w-64 rounded-full blur-3xl bg-blue-400/10 animate-pulse" />
        <div className="absolute right-1/4 bottom-20 h-48 w-48 rounded-full blur-3xl bg-cyan-400/10 animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full blur-3xl bg-blue-500/5" />
      </div>

      <div className="relative space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-blue-400">Area Riservata</p>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent leading-tight">Accedi</h1>
        <p className="text-sm text-gray-300">Inserisci le tue credenziali per continuare.</p>
      </div>

      <div className="relative rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-xl p-8 shadow-2xl shadow-blue-500/10">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
              placeholder="nome@esempio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-3 pr-12 text-white placeholder-gray-500 outline-none transition-all focus:border-blue-400/60 focus:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/20"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-300 transition-colors p-1"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Accesso in corso...
              </span>
            ) : (
              "Entra"
            )}
          </button>
        </form>
        
        {error && (
          <div className="mt-5 rounded-xl border border-red-400/30 bg-gradient-to-br from-red-500/10 to-transparent backdrop-blur-sm p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm text-red-200 font-medium">{error}</p>
          </div>
        )}
      </div>

      <div className="relative text-center space-y-4">
        <p className="text-sm text-gray-400 font-medium">Per richiedere un account, contatta l'amministrazione:</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href="https://wa.me/393791958651"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-xl border border-green-400/30 bg-gradient-to-r from-blue-500/20 to-transparent backdrop-blur-sm px-5 py-2.5 text-sm font-bold text-white transition-all hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-0.5"
          >
            <svg className="h-4 w-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </a>
          <a
            href="mailto:info@gstennisacademy.it"
            className="group inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-transparent backdrop-blur-sm px-5 py-2.5 text-sm font-bold text-white transition-all hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5"
          >
            <svg className="h-4 w-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </a>
        </div>
      </div>
      </div>
    </main>
  );
}
