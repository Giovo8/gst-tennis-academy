'use client';

import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Globe,
} from 'lucide-react';

/**
 * Registro degli eventi di sicurezza (accessi negati, blocchi CSRF, rate limit).
 *
 * Mostra solo le anomalie: il traffico normale non viene registrato, e le
 * richieste alle risorse statiche e a /_next/image non passano dal middleware,
 * quindi non compaiono qui. Per quelle serve il Firewall di Vercel.
 */

interface SecurityEvent {
  id: string;
  tipo: string;
  severita: 'info' | 'warning' | 'critical';
  path: string | null;
  method: string | null;
  status_code: number | null;
  ip_address: string | null;
  user_agent: string | null;
  user_id: string | null;
  dettagli: Record<string, any> | null;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

interface TopIp {
  ip: string;
  eventi: number;
}

const ETICHETTE_TIPO: Record<string, string> = {
  'auth.token_mancante': 'Token mancante',
  'auth.token_non_valido': 'Token non valido',
  'auth.ruolo_insufficiente': 'Ruolo insufficiente',
  'auth.sessione_assente': 'Sessione assente',
  'csrf.origin_rifiutata': 'Origin rifiutata (CSRF)',
  'rate_limit.superato': 'Rate limit superato',
};

const COLORE_SEVERITA: Record<SecurityEvent['severita'], string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#94a3b8',
};

function iconaSeverita(severita: SecurityEvent['severita']) {
  if (severita === 'critical') return <ShieldX className="w-5 h-5 text-red-500" />;
  if (severita === 'warning') return <ShieldAlert className="w-5 h-5 text-amber-500" />;
  return <ShieldCheck className="w-5 h-5 text-secondary/40" />;
}

export default function SecurityEventsPanel() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [topIps, setTopIps] = useState<TopIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [limit, setLimit] = useState(200);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let annullato = false;

    const fetchEvents = async () => {
      setLoading(true);
      setErrore(null);
      try {
        const response = await fetch(`/api/security-events?limit=${limit}`);
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || 'Caricamento degli eventi non riuscito');
        }

        if (annullato) return;
        setEvents(json.events || []);
        setTopIps(json.topIps || []);
      } catch (error) {
        if (annullato) return;
        setErrore(error instanceof Error ? error.message : 'Errore sconosciuto');
      } finally {
        if (!annullato) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      annullato = true;
    };
  }, [limit]);

  const tipiPresenti = Array.from(new Set(events.map((e) => e.tipo)));

  const eventiFiltrati = events.filter((event) => {
    const termine = search.toLowerCase();
    const matchesSearch =
      search === '' ||
      event.tipo.toLowerCase().includes(termine) ||
      event.path?.toLowerCase().includes(termine) ||
      event.ip_address?.toLowerCase().includes(termine) ||
      event.profiles?.email?.toLowerCase().includes(termine);

    const matchesTipo = tipoFilter === 'all' || event.tipo === tipoFilter;

    return matchesSearch && matchesTipo;
  });

  return (
    <div className="space-y-6">
      {topIps.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-secondary/60 uppercase mb-3">
            IP più attivi nelle ultime 24 ore
          </h2>
          <div className="flex flex-wrap gap-3">
            {topIps.map((item) => (
              <div
                key={item.ip}
                className="flex items-center gap-2 bg-white border border-black/10 rounded-lg px-4 py-2.5"
              >
                <Globe className="w-4 h-4 text-secondary/40" />
                <span className="font-mono text-sm text-secondary">{item.ip}</span>
                <span className="text-xs font-bold text-white bg-secondary rounded px-2 py-0.5">
                  {item.eventi}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per tipo, path, IP o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
          />
        </div>

        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary focus:outline-none focus:ring-0 focus:border-black/10"
        >
          <option value="all">Tutti i tipi</option>
          {tipiPresenti.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ETICHETTE_TIPO[tipo] || tipo}
            </option>
          ))}
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-4 py-2.5 rounded-lg bg-white border border-black/10 text-secondary focus:outline-none focus:ring-0 focus:border-black/10"
        >
          <option value={50}>Ultimi 50</option>
          <option value={100}>Ultimi 100</option>
          <option value={200}>Ultimi 200</option>
          <option value={500}>Ultimi 500</option>
          <option value={1000}>Ultimi 1000</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento eventi...</p>
        </div>
      ) : errore ? (
        <div className="text-center py-20 rounded-lg bg-white border border-red-200">
          <ShieldX className="w-16 h-16 mx-auto text-red-300 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            Impossibile caricare gli eventi
          </h3>
          <p className="text-secondary/60">{errore}</p>
        </div>
      ) : eventiFiltrati.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <ShieldCheck className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessun evento</h3>
          <p className="text-secondary/60">
            {events.length === 0
              ? 'Nessuna anomalia registrata: è la condizione normale.'
              : 'Prova a modificare i filtri di ricerca'}
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="space-y-3 min-w-[900px]">
            <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
              <div className="grid grid-cols-[40px_180px_1fr_130px_70px_150px_40px] items-center gap-4">
                <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
                <div className="text-xs font-bold text-white/80 uppercase">Evento</div>
                <div className="text-xs font-bold text-white/80 uppercase">Path</div>
                <div className="text-xs font-bold text-white/80 uppercase">IP</div>
                <div className="text-xs font-bold text-white/80 uppercase">Status</div>
                <div className="text-xs font-bold text-white/80 uppercase">Data e Ora</div>
                <div></div>
              </div>
            </div>

            {eventiFiltrati.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg px-4 py-3 hover:shadow-sm transition-all block cursor-pointer border-l-4 border border-black/10 hover:border-gray-300"
                style={{ borderLeftColor: COLORE_SEVERITA[event.severita] }}
                onClick={() => setExpanded(expanded === event.id ? null : event.id)}
              >
                <div className="grid grid-cols-[40px_180px_1fr_130px_70px_150px_40px] items-center gap-4">
                  <div className="flex items-center justify-center">
                    {iconaSeverita(event.severita)}
                  </div>
                  <div className="font-semibold text-secondary text-sm truncate">
                    {ETICHETTE_TIPO[event.tipo] || event.tipo}
                  </div>
                  <div className="text-sm text-secondary/70 font-mono text-xs truncate">
                    {event.method ? `${event.method} ` : ''}
                    {event.path || '-'}
                  </div>
                  <div className="text-sm text-secondary/80 font-mono text-xs truncate">
                    {event.ip_address || '-'}
                  </div>
                  <div className="text-sm text-secondary/80">{event.status_code ?? '-'}</div>
                  <div className="text-sm text-secondary/80">
                    {new Date(event.created_at).toLocaleString('it-IT')}
                  </div>
                  <div className="flex justify-center">
                    {expanded === event.id ? (
                      <ChevronUp className="h-5 w-5 text-secondary/40" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-secondary/40" />
                    )}
                  </div>
                </div>

                {expanded === event.id && (
                  <div className="mt-4 pt-4 border-t border-secondary/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-secondary">Severità:</span>
                        <span className="ml-2 text-secondary/60">{event.severita}</span>
                      </div>
                      {event.profiles && (
                        <div>
                          <span className="font-medium text-secondary">Utente:</span>
                          <span className="ml-2 text-secondary/60">
                            {event.profiles.full_name} ({event.profiles.email})
                          </span>
                        </div>
                      )}
                      {event.user_agent && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-secondary">User Agent:</span>
                          <span className="ml-2 text-secondary/60 text-xs">{event.user_agent}</span>
                        </div>
                      )}
                      {event.dettagli && Object.keys(event.dettagli).length > 0 && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-secondary mb-2 block">Dettagli:</span>
                          <pre className="bg-secondary/5 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.dettagli, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
