'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Loader2,
  Shield,
  Search,
  SlidersHorizontal,
  GraduationCap,
  Wrench,
  Flag,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type Block = {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  is_disabled: boolean;
  created_at: string;
};

export default function CourtsBlockPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'active' | 'expired' | 'cancelled' | 'all'>(
    'active',
  );

  useEffect(() => {
    loadBlocks();
  }, []);

  async function loadBlocks() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('court_blocks')
        .select('*')
        .order('start_time', { ascending: false });

      if (!error && data) {
        setBlocks(data);
      }
    } catch (err) {
      console.error('Error loading blocks:', err);
    } finally {
      setLoading(false);
    }
  }

  // Raggruppa TUTTI i blocchi con stesso campo, motivo e orario
  function groupConsecutiveBlocks(blocks: Block[]) {
    if (blocks.length === 0) return [];

    const sorted = [...blocks].sort(
      (a, b) =>
        a.court_id.localeCompare(b.court_id) ||
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    // Crea una mappa per raggruppare per campo + motivo + orario
    const groupMap = new Map<
      string,
      {
        id: string;
        court_id: string;
        start_time: string;
        end_time: string;
        reason?: string;
        is_disabled: boolean;
        blockIds: string[];
        allDates: Array<{ start: string; end: string }>;
      }
    >();

    for (const block of sorted) {
      const blockStart = new Date(block.start_time);
      const blockEnd = new Date(block.end_time);
      const startTime = blockStart.getHours() * 60 + blockStart.getMinutes();
      const endTime = blockEnd.getHours() * 60 + blockEnd.getMinutes();

      // Chiave: campo + motivo + orario
      const key = `${block.court_id}|${block.reason || ''}|${startTime}|${endTime}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: block.id,
          court_id: block.court_id,
          start_time: block.start_time,
          end_time: block.end_time,
          reason: block.reason,
          is_disabled: block.is_disabled,
          blockIds: [block.id],
          allDates: [{ start: block.start_time, end: block.end_time }],
        });
      } else {
        const group = groupMap.get(key)!;
        group.blockIds.push(block.id);
        group.allDates.push({ start: block.start_time, end: block.end_time });
        // Aggiorna la data finale del gruppo all'ultima data
        if (new Date(block.end_time) > new Date(group.end_time)) {
          group.end_time = block.end_time;
        }
      }
    }

    return Array.from(groupMap.values());
  }

  const groupedBlocks = groupConsecutiveBlocks(blocks);

  // Determina tipo e icona in base al motivo
  function getBlockStyle(reason?: string) {
    const reasonText = (reason || '').trim();
    const reasonLower = reasonText.toLowerCase();

    if (reasonLower.includes('corso adulti')) {
      return {
        type: 'Corso Adulti',
        icon: GraduationCap,
      };
    }

    if (reasonLower.includes('corsi') || reasonLower.includes('tennis')) {
      return {
        type: 'Corsi Tennis',
        icon: GraduationCap,
      };
    } else if (reasonLower.includes('manutenzione')) {
      return {
        type: 'Manutenzione',
        icon: Wrench,
      };
    } else if (reasonLower.includes('evento')) {
      return {
        type: 'Evento',
        icon: Flag,
      };
    }

    if (reasonLower.startsWith('altro')) {
      return {
        type: 'Altro',
        icon: Shield,
      };
    }

    // Default
    return {
      type: reasonText ? 'Altro' : 'Blocco',
      icon: Shield,
    };
  }

  const hasActiveFilters = filterStatus !== 'active' || sortOrder !== 'desc';

  const nowMs = Date.now();

  const filteredBlocks = groupedBlocks.filter((block) => {
    const isExpired = new Date(block.end_time).getTime() < nowMs;
    const isCancelled = block.is_disabled;

    if (filterStatus === 'active' && (isExpired || isCancelled)) return false;
    if (filterStatus === 'expired' && (!isExpired || isCancelled)) return false;
    if (filterStatus === 'cancelled' && !isCancelled) return false;

    const blockType = getBlockStyle(block.reason).type;
    const blockSearch = `${block.court_id} ${block.reason || ''} ${blockType}`.toLowerCase();
    const matchesSearch = search.trim().length === 0 || blockSearch.includes(search.toLowerCase());
    return matchesSearch;
  });

  const sortedBlocks = [...filteredBlocks].sort((a, b) => {
    const diff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    return sortOrder === 'asc' ? diff : -diff;
  });

  const formatBlockDateTime = (start: Date, end: Date) => {
    const startDate = format(start, 'd/MM/yy', { locale: it });
    const endDate = format(end, 'd/MM/yy', { locale: it });
    const startTime = format(start, 'HH:mm');
    const endTime = format(end, 'HH:mm');

    if (startDate === endDate) {
      return `${startDate} · ${startTime} - ${endTime}`;
    }

    return `${startDate} - ${endDate} · ${startTime} - ${endTime}`;
  };

  const getBlockTitle = (reason?: string) => {
    const text = (reason || '').trim();
    if (!text) return 'Blocco campo';

    const altroWithParens = text.match(/^Altro\s*\(([^)]+)\)(?:\s*-\s*(.+))?$/i);
    if (altroWithParens) {
      const custom = (altroWithParens[1] || '').trim();
      const notes = (altroWithParens[2] || '').trim();
      if (custom && notes) return `${custom} - ${notes}`;
      return custom || notes || 'Altro';
    }

    const altroSimple = text.match(/^Altro\s*-\s*(.+)$/i);
    if (altroSimple) {
      return (altroSimple[1] || '').trim() || 'Altro';
    }

    return text;
  };

  const renderSearchWithFilter = () => (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/40" />
          <input
            type="text"
            placeholder="Cerca per campo, motivo o tipo blocco..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full pl-10 pr-4 rounded-lg bg-white border border-black/10 text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsFilterPanelOpen((prev) => !prev)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
            hasActiveFilters || isFilterPanelOpen
              ? 'border-secondary bg-secondary text-white hover:opacity-90'
              : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
          }`}
          aria-label="Mostra o nascondi chips filtri"
          title="Filtri"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {isFilterPanelOpen && (
        <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:w-full">
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                sortOrder === 'asc'
                  ? 'border-[#023047] bg-[#023047] text-white hover:opacity-90'
                  : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
              }`}
              aria-label="Inverti ordinamento"
              title="Inverti ordinamento"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
              {(
                [
                  { value: 'active', label: 'Attivi' },
                  { value: 'expired', label: 'Scaduti' },
                  { value: 'cancelled', label: 'Annullati' },
                  { value: 'all', label: 'Tutti' },
                ] as const
              ).map((option) => {
                const isSelected = filterStatus === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilterStatus(option.value)}
                    className={`h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors sm:flex-1 sm:min-w-0 ${
                      isSelected
                        ? 'border-secondary bg-secondary text-white'
                        : 'border-black/10 bg-white text-secondary hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterStatus('active');
                setSortOrder('desc');
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#023047] bg-[#023047] text-white hover:opacity-90 transition-colors"
              aria-label="Reset filtri"
              title="Reset filtri"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pt-3">
      <div>
        <p className="breadcrumb text-secondary/60">
          <Link
            href="/dashboard/admin/bookings"
            className="hover:text-secondary/80 transition-colors"
          >
            Prenotazioni
          </Link>
          {' › '}
          <span>Blocco Campi</span>
        </p>
        <h1 className="text-4xl font-bold text-secondary">Blocco Campi</h1>
      </div>

      <div className="w-full">
        <Link
          href="/dashboard/admin/courts/new"
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Crea Blocco</span>
        </Link>
      </div>

      <div className="flex flex-col gap-3">{renderSearchWithFilter()}</div>

      {/* Lista blocchi */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-secondary" />
          <p className="mt-4 text-secondary/60">Caricamento blocchi...</p>
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="text-center py-20 rounded-lg bg-white">
          <Shield className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">
            {search || hasActiveFilters ? 'Nessun blocco trovato' : 'Nessun blocco attivo'}
          </h3>
          <p className="text-secondary/60 mb-6">Prova a modificare i filtri di ricerca</p>
          <Link
            href="/dashboard/admin/courts/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-opacity"
          >
            <Plus className="h-5 w-5" />
            <span>Crea Blocco</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedBlocks.map((block) => {
            const blockStyle = getBlockStyle(block.reason);
            const BlockIcon = blockStyle.icon;
            const firstDate = new Date(block.allDates[0].start);
            const lastDate = new Date(block.allDates[block.allDates.length - 1].end);
            const dateTimeLabel = formatBlockDateTime(firstDate, lastDate);

            const cardBg =
              blockStyle.type === 'Corso Adulti'
                ? '#023047'
                : blockStyle.type === 'Corsi Tennis'
                ? '#05384c'
                : blockStyle.type === 'Manutenzione'
                ? 'var(--color-frozen-lake-900)'
                : blockStyle.type === 'Evento'
                ? 'var(--color-frozen-lake-900)'
                : blockStyle.type === 'Altro'
                ? 'var(--secondary)'
                : 'var(--color-frozen-lake-800)';

            return (
              <div
                key={block.id}
                className="rounded-lg overflow-visible cursor-pointer hover:opacity-95 transition-opacity"
                style={{ background: cardBg }}
                onClick={() => router.push(`/dashboard/admin/courts/${block.id}`)}
              >
                <div className="flex items-center gap-4 py-3 px-3">
                  <div className="flex items-center justify-center bg-white/10 rounded-lg w-11 h-11 flex-shrink-0">
                    <BlockIcon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {getBlockTitle(block.reason)}
                    </p>
                    <p className="text-xs text-white/70 mt-0.5 truncate">
                      {block.court_id} · {dateTimeLabel}
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-white/70 flex-shrink-0 uppercase tracking-wide hidden sm:block">
                    {blockStyle.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
