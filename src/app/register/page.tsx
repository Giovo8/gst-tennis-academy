"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { VALIDATION_RULES } from "@/lib/constants/app";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code");
  
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(true);
  const [codeValid, setCodeValid] = useState(false);
  const [codeRole, setCodeRole] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
  });
  const [error, setError] = useState("");

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

  function getSignupErrorMessage(responseData: any): string {
    if (Array.isArray(responseData?.details) && responseData.details.length > 0) {
      return responseData.details[0]?.message || "Dati non validi";
    }

    return responseData?.error || "Errore durante la registrazione";
  }

  useEffect(() => {
    if (inviteCode) {
      validateCode();
    } else {
      setValidatingCode(false);
    }
  }, [inviteCode]);

  async function validateCode() {
    try {
      // Use API endpoint to bypass RLS (service role on server)
      const response = await fetch(`/api/invite-codes/validate?code=${encodeURIComponent(inviteCode || "")}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setCodeValid(false);
        if (data.error) {
          setError(data.error);
        }
      } else {
        setCodeValid(true);
        setCodeRole(data.role);
      }
    } catch (err) {
      setCodeValid(false);
    } finally {
      setValidatingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const emailToUse = formData.email.trim().toLowerCase();
      const normalizedPhone = formData.phone.trim();

      // Call API endpoint for immediate signup with auto-confirmed email
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          password: formData.password,
          fullName: formData.fullName,
          phone: normalizedPhone || undefined,
          role: codeRole,
          inviteCode: inviteCode,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        throw new Error(getSignupErrorMessage(signupData));
      }

      // L'utente è già creato e confermato, effettua login diretto
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: formData.password,
      });

      if (signInError) {
        console.error("Errore login automatico:", signInError);
        throw new Error("Registrazione completata ma login fallito. Per favore effettua il login.");
      }

      // Attendi la sessione
      await new Promise(resolve => setTimeout(resolve, 500));

      // Determina la dashboard in base al ruolo
      let destination = "/dashboard/atleta";
      if (codeRole === "admin") {
        destination = "/dashboard/admin";
      } else if (codeRole === "gestore") {
        destination = "/dashboard/admin";
      } else if (codeRole === "maestro") {
        destination = "/dashboard/maestro";
      }

      router.push(destination);
    } catch (err: any) {
      console.error("Errore registrazione:", err);
      setError(err.message || "Errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  }

  if (validatingCode) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-secondary animate-spin" />
          <p className="mt-4 text-secondary/60">Validazione codice invito...</p>
        </div>
      </main>
    );
  }

  if (!inviteCode || !codeValid) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1400px] mx-auto min-h-screen flex flex-col bg-gray-50">
          <main className="flex-1 flex items-center justify-center px-6 sm:px-4 py-10">
            <div className="w-full sm:max-w-md bg-white rounded-lg border border-black/10 px-8 py-10">
              <div className="mb-6 sm:mb-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-secondary mb-3">Codice Non Valido</h2>
                <p className="text-base text-secondary opacity-70">
                  {error || "Il codice invito fornito non è valido o è già stato utilizzato."}
                </p>
              </div>

              <div className="rounded-lg bg-secondary/5 border border-black/10 p-6 mb-8">
                <p className="text-sm text-secondary font-medium mb-4">
                  Per richiedere un account, contatta la segreteria
                </p>
                <div className="flex w-full items-center justify-center gap-3">
                  <a
                    href="https://wa.me/393762351777"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 h-12 items-center justify-center gap-2 px-5 bg-secondary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
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

              <div className="text-center">
                <Link href="/login" className="text-sm text-secondary opacity-70 hover:opacity-100 transition-opacity font-medium">
                  Torna al Login
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto min-h-screen flex flex-col bg-gray-50">

        {/* Register Form */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-4 py-10">
          <div className="w-full sm:max-w-md bg-white rounded-lg border border-black/10 px-8 py-10">
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
              <p className="text-base sm:text-lg text-secondary opacity-70">
                Registrazione come <span className="font-bold capitalize">{codeRole}</span>
              </p>
            </div>

            <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
              {/* Nome Completo */}
              <div>
                <label htmlFor="fullName" className="block text-sm sm:text-base font-semibold text-secondary mb-2">
                  Nome Completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  className="login-input w-full px-4 py-3.5 sm:py-4 bg-white border border-black/10 rounded-lg text-base text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                  placeholder="Mario Rossi"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm sm:text-base font-semibold text-secondary mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="login-input w-full px-4 py-3.5 sm:py-4 bg-white border border-black/10 rounded-lg text-base text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                  placeholder="nome@esempio.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="email"
                />
              </div>

              {/* Telefono */}
              <div>
                <label htmlFor="phone" className="block text-sm sm:text-base font-semibold text-secondary mb-2">
                  Telefono <span className="text-secondary/40 font-normal">(opzionale)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="login-input w-full px-4 py-3.5 sm:py-4 bg-white border border-black/10 rounded-lg text-base text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                  placeholder="+39 123 456 7890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  autoComplete="tel"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-secondary mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="login-input w-full px-4 py-3.5 sm:py-4 bg-white border border-black/10 rounded-lg text-base text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10 pr-12"
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
                <p className="mt-2 text-sm text-secondary opacity-70">
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
                    className="login-input w-full px-4 py-3.5 sm:py-4 bg-white border border-black/10 rounded-lg text-base text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10 pr-12"
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
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registrazione in corso...
                  </span>
                ) : (
                  "Registrati"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-frozen-600" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}