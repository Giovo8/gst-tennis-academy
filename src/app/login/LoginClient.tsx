"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getDestinationForRole, type UserRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity/logActivity";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    // Get redirect parameter from URL
    const redirect = searchParams.get("redirect");
    if (redirect) {
      setRedirectPath(decodeURIComponent(redirect));
    }
  }, [searchParams]);

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
        // PGRST116 = 0 rows returned (profilo non esiste)
        const isNotFound = (profileError as { code?: string }).code === 'PGRST116';
        throw new Error(isNotFound
          ? "Profilo non trovato. Contatta l'amministratore."
          : `Errore accesso: ${profileError.message || "Profilo non configurato"}`);
      }

      if (!profile) {
        // Profilo non trovato - logout e mostra errore
        await supabase.auth.signOut();
        throw new Error("Profilo non trovato. Contatta l'amministratore.");
      }

      // Log login activity
      await logActivity({
        action: "user.login",
        metadata: {
          role: profile.role,
          fullName: profile.full_name,
        },
      });

      // 3. Reindirizza alla pagina richiesta o alla dashboard del ruolo
      const destination = redirectPath || getDestinationForRole(profile.role as UserRole);
      router.push(destination);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'accesso");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto min-h-screen flex flex-col bg-gray-50">

        {/* Login Form */}
        <main className="flex-1 flex items-center justify-center px-6 sm:px-4 py-10">
        <div className="w-full sm:max-w-md bg-white rounded-lg border border-black/10 px-8 py-10">
          {/* Login Card */}
          <div className="mb-4 sm:mb-10">
          <div className="mb-6 sm:mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Image
                src="/images/logo-tennis.png"
                alt="GST Tennis Academy"
                width={48}
                height={48}
                priority
                className="h-10 w-10"
              />
              <span className="text-3xl sm:text-4xl font-bold text-secondary">Area GST</span>
            </div>
            <p className="text-[1.22rem] sm:text-lg text-secondary opacity-70">Accedi al tuo account</p>
          </div>

          {/* Redirect Info Message */}
          {redirectPath && (
            <div className="mb-6 sm:mb-8 rounded-lg bg-secondary/5 border border-black/10 p-4">
              <p className="text-sm text-secondary font-medium">
                Accedi per continuare alla pagina richiesta
              </p>
            </div>
          )}

          <form className="space-y-5 sm:space-y-8" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm sm:text-base font-semibold text-secondary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="login-input w-full px-4 py-3.5 sm:py-4 bg-white border border-black/10 rounded-lg text-base text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="nome@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="login-input w-full px-4 py-3.5 sm:py-4 bg-white border border-black/10 rounded-lg text-base text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-secondary transition-colors p-2"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-secondary/5 border border-black/10 p-4">
                <p className="text-sm text-secondary font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 px-4 bg-secondary text-white font-semibold rounded-lg text-base hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                "Accesso in corso..."
              ) : (
                "Accedi"
              )}
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="mt-7 sm:mt-12 text-center">
          <p className="text-sm text-secondary opacity-70 mb-4 sm:mb-5">
            Non hai un account? Contatta l&apos;amministrazione
          </p>
          <div className="flex w-full items-center justify-center gap-3">
            <a
              href="https://wa.me/393762351777"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 h-12 items-center justify-center gap-2 px-5 bg-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
            >
              WhatsApp
            </a>
            <a
              href="mailto:info@gstennisacademy.it"
              className="inline-flex flex-1 h-12 items-center justify-center gap-2 px-5 bg-[#023047] border border-[#023047] text-white rounded-lg text-sm font-semibold hover:bg-[#023047]/90 transition-all"
            >
              Email
            </a>
          </div>
        </div>
        </div>
        </main>
      </div>
    </div>
  );
}
