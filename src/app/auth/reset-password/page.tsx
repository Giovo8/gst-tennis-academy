"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { VALIDATION_RULES } from "@/lib/constants/app";

function ResetPasswordForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function bootstrapRecoverySession() {
      // Handle hash-based links (e.g. #access_token=...&refresh_token=...)
      if (typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionError || !data.session) {
        setError("Sessione reset non valida o scaduta. Richiedi un nuovo link.");
        setSessionReady(false);
        return;
      }

      setSessionReady(true);
    }

    bootstrapRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        setError("");
        setSessionReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function validatePassword(password: string): string | null {
    if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      return `La password deve contenere almeno ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} caratteri`;
    }
    if (!/[A-Z]/.test(password)) {
      return "La password deve contenere almeno una lettera maiuscola";
    }
    if (!/[a-z]/.test(password)) {
      return "La password deve contenere almeno una lettera minuscola";
    }
    if (!/[0-9]/.test(password)) {
      return "La password deve contenere almeno un numero";
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return "La password deve contenere almeno un carattere speciale";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!sessionReady) {
      setError("Sessione reset non valida o scaduta. Richiedi un nuovo link.");
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Errore durante l'aggiornamento della password");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-white flex flex-col">
        <div className="sticky top-0 z-50 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-16 sm:h-20">
              <img src="/images/logo-tennis.png" alt="GST Tennis Academy" className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-secondary mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary mb-3">Password Aggiornata</h2>
            <p className="text-base text-secondary opacity-70 mb-8">
              La tua password è stata aggiornata con successo. Verrai reindirizzato al login tra pochi secondi.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 bg-secondary text-white font-semibold rounded-md text-base hover:opacity-90 transition-all"
            >
              Vai al Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Logo Header */}
      <div className="sticky top-0 z-50 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16 sm:h-20">
            <img src="/images/logo-tennis.png" alt="GST Tennis Academy" className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 sm:mb-10 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-secondary mb-3">Nuova Password</h2>
            <p className="text-base sm:text-lg text-secondary opacity-70">
              Scegli una nuova password sicura
            </p>
          </div>

          <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
            {/* Nuova Password */}
            <div>
              <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-secondary mb-2">
                Nuova Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3.5 sm:py-4 bg-white border-2 border-secondary/20 rounded-md text-base text-secondary placeholder-secondary/40 focus:outline-none focus:border-secondary transition-all pr-12"
                  placeholder="Minimo 8 caratteri"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-secondary transition-colors p-2"
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-secondary/60">
                Minimo 8 caratteri con maiuscola, minuscola, numero e simbolo.
              </p>
            </div>

            {/* Conferma Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm sm:text-base font-semibold text-secondary mb-2">
                Conferma Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3.5 sm:py-4 bg-white border-2 border-secondary/20 rounded-md text-base text-secondary placeholder-secondary/40 focus:outline-none focus:border-secondary transition-all pr-12"
                  placeholder="Ripeti la password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-secondary transition-colors p-2"
                  aria-label={showConfirmPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-secondary/5 border border-secondary/10 p-4">
                <p className="text-sm text-secondary font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 px-4 bg-secondary text-white font-semibold rounded-md text-base hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Aggiornamento in corso...
                </span>
              ) : (
                "Aggiorna Password"
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-secondary opacity-70 hover:opacity-100 transition-opacity font-medium">
              Torna al Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="mx-auto h-12 w-12 text-secondary animate-spin" />
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
