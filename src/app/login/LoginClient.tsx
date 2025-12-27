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

      if (profileError || !profile) {
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-[#9fb6a6]">Area Riservata</p>
        <h1 className="text-2xl font-semibold text-white">Accedi</h1>
        <p className="text-sm text-[#c6d8c9]">Inserisci le tue credenziali per continuare.</p>
      </div>

      <div className="rounded-3xl border border-[#2f7de1]/30 bg-[#1a3d5c]/60 p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-[#c6d8c9]">
            Email
            <input
              type="email"
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#1a3d5c]/60 px-3 py-2 text-white outline-none focus:border-[#7de3ff]/60"
              placeholder="nome@dominio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm text-[#c6d8c9]">
            Password
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-white/15 bg-[#1a3d5c]/60 px-3 py-2 pr-10 text-white outline-none focus:border-[#7de3ff]/60"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c6d8c9] hover:text-white transition"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button
            type="submit"
            className="w-full rounded-full px-4 py-3 text-sm font-semibold bg-[#2f7de1] text-white transition hover:bg-[#2563c7]"
            disabled={loading}
          >
            {loading ? "Accesso in corso..." : "Entra"}
          </button>
        </form>
        {error && (
          <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>
        )}
      </div>

      <div className="text-center text-sm text-muted">
        <p>Per richiedere un account, contatta l'amministrazione.</p>
      </div>
    </main>
  );
}
