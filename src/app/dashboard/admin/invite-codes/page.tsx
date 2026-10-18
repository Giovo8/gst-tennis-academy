'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  Ticket,
  Loader2,
  CheckCircle2,
  Plus,
  Search,
  Crown,
  Home,
  Dumbbell,
  User,
} from 'lucide-react';
import Link from 'next/link';

type InviteCode = {
  id: string;
  code: string;
  role: string;
  used_by: string | null;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_remaining: number | null;
  created_by: string | null;
  creator?: {
    full_name: string;
    email: string;
  } | null;
};

export default function InviteCodesPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    try {
      // Prima carica i codici
      const { data: codesData, error: codesError } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) {
        console.error('Error loading codes:', codesError);
        return;
      }

      if (!codesData || codesData.length === 0) {
        setCodes([]);
        return;
      }

      // Poi carica i profili dei creatori
      const creatorIds = codesData.map((code) => code.created_by).filter((id) => id != null);

      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', creatorIds);

        // Mappa i profili ai codici
        const codesWithCreators = codesData.map((code) => ({
          ...code,
          creator: profilesData?.find((p) => p.id === code.created_by) || null,
        }));

        setCodes(codesWithCreators);
      } else {
        setCodes(codesData);
      }
    } catch (error) {
      console.error('Error loading codes:', error);
    } finally {
      setLoading(false);
    }
  }

  const roleConfig: Record<string, { label: string; bg: string; Icon: React.ElementType }> = {
    admin: { label: 'Admin', bg: '#023047', Icon: Crown },
    gestore: { label: 'Gestore', bg: '#023047', Icon: Home },
    maestro: { label: 'Maestro', bg: '#05384c', Icon: Dumbbell },
    atleta: { label: 'Atleta', bg: 'var(--secondary)', Icon: User },
  };

  // Helper per verificare se un codice è ancora valido
  const isCodeValid = (code: InviteCode) => {
    const notExpired = !code.expires_at || new Date(code.expires_at) > new Date();
    const hasUsesLeft =
      code.max_uses === null || (code.uses_remaining !== null && code.uses_remaining > 0);
    return notExpired && hasUsesLeft;
  };

  // Filtra i codici in base alla ricerca
  const filteredCodes = codes.filter((code) => {
    const matchesSearch =
      !search ||
      code.code.toLowerCase().includes(search.toLowerCase()) ||
      roleConfig[code.role]?.label.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pt-3">
      {/* Header actions */}
      <div className="w-full">
        <Link
          href="/dashboard/admin/invite-codes/new"
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Crea Codice
        </Link>
      </div>

      <p className="breadcrumb text-secondary/60 text-sm">
        <Link href="/dashboard/admin/users" className="hover:text-secondary/80 transition-colors">
          Gestione Utenti
        </Link>
        {' › '}
        <span>Codici Invito</span>
      </p>

      {/* Search */}
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per codice o ruolo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
          />
        </div>
      </div>

      {/* Codes List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento codici...</p>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <Ticket className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {search ? 'Nessun codice trovato' : 'Nessun codice'}
          </h3>
          <p className="text-secondary/60">
            {search ? 'Prova a modificare la ricerca' : 'Genera il primo codice invito'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCodes.map((code) => {
            const { bg: cardBg, Icon: RoleIcon } = roleConfig[code.role] || roleConfig.atleta;
            const valid = isCodeValid(code);

            const createdByLabel = code.creator?.full_name || code.creator?.email || '-';

            return (
              <div
                key={code.id}
                className="rounded-lg overflow-visible hover:opacity-95 transition-opacity cursor-pointer"
                style={{ background: cardBg }}
                onClick={() => router.push(`/dashboard/admin/invite-codes/${code.id}`)}
              >
                <div className="flex items-start gap-4 py-3 px-3 sm:items-center">
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                    <RoleIcon className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p
                        className={`font-semibold text-white text-sm truncate ${
                          !valid ? 'line-through text-white/60' : ''
                        }`}
                      >
                        {code.code}
                      </p>
                      {copiedId === code.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white/90 flex-shrink-0" />
                      ) : null}
                    </div>
                    <p className="text-xs text-white/60 mt-0.5 truncate">
                      Creato da: {createdByLabel}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
