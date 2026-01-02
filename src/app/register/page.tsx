"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code");
  
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(true);
  const [codeValid, setCodeValid] = useState(false);
  const [codeRole, setCodeRole] = useState<string>("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phone: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (inviteCode) {
      validateCode();
    } else {
      setValidatingCode(false);
    }
  }, [inviteCode]);

  async function validateCode() {
    try {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("code", inviteCode)
        .single();

      if (error || !data) {
        setCodeValid(false);
      } else if (data.used_by) {
        setCodeValid(false);
        setError("Questo codice è già stato utilizzato");
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

    if (formData.password.length < 6) {
      setError("La password deve essere almeno di 6 caratteri");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const emailToUse = formData.email.trim().toLowerCase();

      // Controlla se esiste un profilo orfano con questa email
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", emailToUse)
        .single();

      if (existingProfile) {
        // Esiste un profilo orfano - proviamo a eliminarlo
        await supabase
          .from("profiles")
          .delete()
          .eq("id", existingProfile.id);
        
        console.log("Profilo orfano eliminato:", existingProfile.id);
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailToUse,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: codeRole,
          },
        },
      });

      // Gestisci errori specifici di Supabase Auth
      if (authError) {
        console.error("Errore Supabase Auth:", authError);
        if (authError.message.includes("User already registered") || 
            authError.message.includes("already registered")) {
          throw new Error("Questa email è già registrata nel sistema. Prova ad accedere o usa un'altra email.");
        }
        // Mostra l'errore originale di Supabase
        throw new Error(`Errore durante la registrazione: ${authError.message}`);
      }

      if (authData.user) {
        // Attendi un momento per permettere al trigger del database di creare il profilo
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Crea o aggiorna il profilo usando upsert
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: emailToUse,
            full_name: formData.fullName,
            phone: formData.phone,
            role: codeRole,
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error("Errore profilo:", profileError);
          throw profileError;
        }

        // Marca il codice come utilizzato
        await supabase
          .from("invite_codes")
          .update({ used_by: authData.user.id })
          .eq("code", inviteCode);

        alert("Registrazione completata con successo!");
        router.push("/login");
      }
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
          <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-600">Validazione codice invito...</p>
        </div>
      </main>
    );
  }

  if (!inviteCode || !codeValid) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-700 mb-3">
              Registrazione Non Disponibile
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              {error || "Codice invito non valido o mancante."}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Per richiedere un account, contatta la segreteria o un amministratore.
            </p>
            <Link 
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-700 transition-all shadow-sm"
            >
              Torna al Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-700 mb-2">
              Crea Account
            </h1>
            <p className="text-sm text-gray-600">
              Registrazione come: <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">{codeRole}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mario Rossi"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@esempio.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Telefono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+39 123 456 7890"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Minimo 6 caratteri"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Conferma Password *
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ripeti la password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Registrazione in corso...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Registrati
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Hai già un account? Accedi
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

